use crate::s3::{BucketProvider, S3Config};

use super::{BucketInfo, ObjectInfo};
use aws_config::Region;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use aws_sdk_s3::{Client, Error};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::io::{Cursor, Write};
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::task::JoinHandle;
use zip::write::ZipWriter;
use zip::CompressionMethod;

type DownloadTaskHandle =
    JoinHandle<Result<(String, Vec<u8>), Box<dyn std::error::Error + Send + Sync>>>;

#[derive(Clone)]
pub struct S3Service {
    client: Client,
    provider: BucketProvider,
    endpoint_url: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct S3ServiceConfig {
    pub config: S3Config,
    pub region: String,
    pub endpoint_url: String,
    pub provider: BucketProvider,
}

#[derive(Clone)]
pub struct GetBucketEndpointOptions {
    name: String,
    region: Option<String>,
}

impl S3Service {
    pub async fn new(service_config: S3ServiceConfig) -> Result<Self, Error> {
        let region = Region::new(service_config.region);

        let aws_config = aws_config::ConfigLoader::default()
            .region(region)
            .endpoint_url(service_config.endpoint_url.clone())
            .load()
            .await;

        let credentials = aws_sdk_s3::config::Credentials::new(
            service_config.config.common.access_key_id,
            service_config.config.common.secret_access_key,
            None,
            None,
            "manual",
        );

        let s3_config = aws_sdk_s3::config::Builder::from(&aws_config)
            .credentials_provider(credentials)
            .force_path_style(true) // Required for LocalStack
            .build();

        let client = Client::from_conf(s3_config);
        let provider = service_config.provider;

        Ok(S3Service {
            client,
            provider,
            endpoint_url: service_config.endpoint_url,
        })
    }

    pub fn get_bucket_endpoint(&self, opts: GetBucketEndpointOptions) -> String {
        let endpoint_url = match self.provider {
            BucketProvider::S3 => {
                format!(
                    "https://s3.{}.amazonaws.com",
                    opts.region.unwrap_or("us-east-1".to_string())
                )
            }
            _ => self.endpoint_url.clone(),
        };

        format!("{}/{}", endpoint_url, opts.name)
    }

    pub fn get_object_url(
        &self,
        bucket_name: &str,
        object_key: &str,
        region: Option<String>,
    ) -> String {
        let bucket_endpoint_opts = GetBucketEndpointOptions {
            name: bucket_name.to_string(),
            region,
        };

        let bucket_url = self.get_bucket_endpoint(bucket_endpoint_opts);

        // URL encode the object key to handle special characters, spaces, etc.
        let encoded_key = object_key
            .chars()
            .map(|c| match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' | '/' => c.to_string(),
                _ => format!("%{:02X}", c as u8),
            })
            .collect::<String>();

        format!("{}/{}", bucket_url, encoded_key)
    }

    pub async fn list_buckets(&self) -> Result<Vec<BucketInfo>, Error> {
        let mut all_buckets = Vec::new();
        let mut continuation_token: Option<String> = None;

        loop {
            let mut list_buckets_req = self.client.list_buckets();

            // Not all S3 compatible stores support the --max-buckets parameter
            if self.provider == BucketProvider::S3 {
                list_buckets_req = list_buckets_req.max_buckets(1000);
            }

            if let Some(token) = continuation_token {
                list_buckets_req = list_buckets_req.continuation_token(token);
            }

            let resp = list_buckets_req.send().await?;

            if let Some(buckets) = resp.buckets {
                for bucket in buckets {
                    let get_bucket_opts = GetBucketEndpointOptions {
                        name: bucket.name.clone().unwrap_or_default(),
                        region: bucket.bucket_region.clone(),
                    };

                    let bucket_info = BucketInfo {
                        provider: self.provider.clone(),
                        name: bucket.name.unwrap_or_default(),
                        creation_date: bucket.creation_date.map(|date| date.to_string()),
                        region: bucket.bucket_region.unwrap_or_default(),
                        endpoint_url: self.get_bucket_endpoint(get_bucket_opts),
                    };

                    all_buckets.push(bucket_info);
                }
            }

            continuation_token = resp.continuation_token;

            if continuation_token.is_none() {
                break;
            }
        }

        Ok(all_buckets)
    }

    pub async fn list_objects(
        &self,
        bucket_name: &str,
        prefix: Option<&str>,
        recursive: bool,
        region: Option<String>,
    ) -> Result<Vec<ObjectInfo>, Error> {
        let mut all_objects = Vec::new();
        let mut continuation_token: Option<String> = None;

        loop {
            let mut request = self.client.list_objects_v2().bucket(bucket_name);

            if let Some(prefix) = prefix {
                request = request.prefix(prefix);
            }

            if !recursive {
                request = request.delimiter("/");
            }

            if let Some(token) = continuation_token {
                request = request.continuation_token(token);
            }

            let resp = request.send().await?;

            for prefix in resp.common_prefixes() {
                if let Some(prefix_str) = prefix.prefix() {
                    let url = self.get_object_url(bucket_name, prefix_str, region.clone());
                    all_objects.push(ObjectInfo {
                        key: prefix_str.to_string(),
                        size: None,
                        last_modified: None,
                        storage_class: None,
                        is_folder: true,
                        url,
                    });
                }
            }

            for object in resp.contents() {
                if let Some(key) = object.key() {
                    if !key.ends_with('/') {
                        let url = self.get_object_url(bucket_name, key, region.clone());
                        all_objects.push(ObjectInfo {
                            key: key.to_string(),
                            size: object.size(),
                            last_modified: object.last_modified().map(|date| date.to_string()),
                            storage_class: object.storage_class().map(|sc| sc.as_str().to_string()),
                            is_folder: false,
                            url,
                        });
                    }
                }
            }

            if resp.is_truncated() == Some(true) {
                continuation_token = resp.next_continuation_token().map(|s| s.to_string());
            } else {
                break;
            }
        }

        Ok(all_objects)
    }

    pub async fn upload_objects(
        self,
        bucket_name: &str,
        prefix: Option<String>,
        file_paths: Vec<PathBuf>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut handles: Vec<JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>> =
            Vec::new();

        for path in file_paths {
            let bucket_name_clone = bucket_name.to_string();
            let prefix_clone = prefix.clone();
            let client_clone = self.client.clone();

            let handle = tokio::spawn(async move {
                let file_name = path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .ok_or("Failed to convert path to string")?;

                let key = match prefix_clone {
                    Some(p) if !p.is_empty() => {
                        if p.ends_with('/') {
                            format!("{}{}", p, file_name)
                        } else {
                            format!("{}/{}", p, file_name)
                        }
                    }
                    _ => file_name.to_string(),
                };

                let mut file = File::open(&path).await?;
                let mut contents = Vec::new();
                file.read_to_end(&mut contents).await?;

                let body = ByteStream::from(contents);

                client_clone
                    .put_object()
                    .bucket(&bucket_name_clone)
                    .key(key)
                    .body(body)
                    .send()
                    .await?;

                Ok(())
            });
            handles.push(handle);
        }

        for handle in handles {
            match handle.await {
                Ok(upload_result) => {
                    if let Err(e) = upload_result {
                        eprintln!("Upload task failed: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("Task panicked: {}", e);
                }
            }
        }

        Ok(())
    }

    pub async fn delete_objects(
        &self,
        bucket_name: &str,
        keys: Vec<String>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut handles: Vec<JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>> =
            Vec::new();

        for key in keys {
            let client_clone = self.client.clone();
            let bucket_name_clone = bucket_name.to_string();
            let key_clone = key.clone();

            let handle = tokio::spawn(async move {
                client_clone
                    .delete_object()
                    .bucket(&bucket_name_clone)
                    .key(&key_clone)
                    .send()
                    .await?;
                Ok(())
            });

            handles.push(handle);
        }

        for handle in handles {
            match handle.await {
                Ok(delete_result) => delete_result?,
                Err(e) => {
                    eprintln!("Task panicked: {}", e);
                    return Err(format!("Task panicked: {}", e).into());
                }
            }
        }

        Ok(())
    }

    pub async fn download_object(
        &self,
        bucket_name: &str,
        key: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let resp = self
            .client
            .get_object()
            .bucket(bucket_name)
            .key(key)
            .send()
            .await?;

        let data = resp.body.collect().await?.into_bytes().to_vec();
        Ok(data)
    }

    pub async fn download_objects(
        &self,
        bucket_name: &str,
        keys: Vec<String>,
    ) -> Result<Vec<(String, Vec<u8>)>, Box<dyn std::error::Error + Send + Sync>> {
        let mut handles: Vec<DownloadTaskHandle> = Vec::new();

        for key in keys {
            let s3_service_clone = self.clone();
            let bucket_name_clone = bucket_name.to_string();

            let handle = tokio::spawn(async move {
                let data = s3_service_clone
                    .download_object(&bucket_name_clone, &key)
                    .await?;
                Ok((key, data))
            });

            handles.push(handle);
        }

        let mut results = Vec::new();

        for handle in handles {
            match handle.await {
                Ok(download_result) => {
                    if let Ok(data) = download_result {
                        results.push(data);
                    }
                }
                Err(e) => {
                    eprintln!("Task panicked: {}", e);
                }
            }
        }

        Ok(results)
    }

    pub async fn download_folder(
        &self,
        bucket_name: &str,
        prefix: &str,
        region: Option<String>,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let objects = self
            .list_objects(bucket_name, Some(prefix), true, region)
            .await?;

        let file_keys: Vec<String> = objects
            .into_iter()
            .filter(|obj| !obj.is_folder)
            .map(|obj| obj.key)
            .collect();

        let downloaded_files = self.download_objects(bucket_name, file_keys).await?;

        let mut buffer = Cursor::new(Vec::new());
        let mut zip_writer = ZipWriter::new(&mut buffer);

        let options = zip::write::SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o755);

        let normalized_prefix = if prefix.ends_with('/') {
            prefix.to_string()
        } else {
            format!("{}/", prefix)
        };

        for (key, data) in downloaded_files {
            let stripped_key = key.strip_prefix(&normalized_prefix).unwrap_or(&key);

            zip_writer.start_file(stripped_key, options)?;
            zip_writer.write_all(&data)?;
        }

        zip_writer.finish()?;

        Ok(buffer.into_inner())
    }

    pub async fn create_folder(&self, bucket_name: &str, folder_key: &str) -> Result<(), Error> {
        self.client
            .put_object()
            .bucket(bucket_name)
            .key(folder_key)
            .send()
            .await?;

        Ok(())
    }

    pub async fn delete_folder(
        &self,
        bucket_name: &str,
        folder_prefix: &str,
        region: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Safety check: prevent deletion of root or invalid paths
        if folder_prefix.is_empty() || folder_prefix == "/" {
            return Err("Cannot delete root folder".into());
        }

        let folder_prefix_with_slash = if folder_prefix.ends_with('/') {
            folder_prefix.to_string()
        } else {
            format!("{}/", folder_prefix)
        };

        // Recursively collect all objects (files and folders) to delete
        let mut all_keys = Vec::new();
        let mut prefixes_to_process = vec![folder_prefix_with_slash.clone()];
        let mut processed_prefixes = std::collections::HashSet::new();
        let mut depth = 0;
        const MAX_DEPTH: usize = 1000; // Prevent infinite loops or excessive nesting
        const MAX_OBJECTS: usize = 100_000; // Prevent memory exhaustion

        while let Some(current_prefix) = prefixes_to_process.pop() {
            if processed_prefixes.contains(&current_prefix) {
                continue;
            }
            processed_prefixes.insert(current_prefix.clone());

            depth += 1;
            if depth > MAX_DEPTH {
                return Err("Folder structure too deep or contains circular references".into());
            }

            if all_keys.len() > MAX_OBJECTS {
                return Err("Folder contains too many objects for safe deletion".into());
            }

            let objects = self
                .list_objects(bucket_name, Some(&current_prefix), false, region.clone())
                .await?;

            for obj in objects {
                if !obj.key.starts_with(&folder_prefix_with_slash) {
                    continue;
                }

                all_keys.push(obj.key.clone());

                if obj.is_folder {
                    prefixes_to_process.push(obj.key);
                }
            }
        }

        // Always ensure we include the main folder object itself (handles empty folders)
        if !all_keys.contains(&folder_prefix_with_slash) {
            all_keys.push(folder_prefix_with_slash);
        }

        const BATCH_SIZE: usize = 1000;

        for chunk in all_keys.chunks(BATCH_SIZE) {
            let keys_to_delete: Vec<ObjectIdentifier> = chunk
                .iter()
                .map(|key| ObjectIdentifier::builder().key(key).build().unwrap())
                .collect();

            let delete = Delete::builder()
                .set_objects(Some(keys_to_delete))
                .quiet(true)
                .build()?;

            self.client
                .delete_objects()
                .bucket(bucket_name)
                .delete(delete)
                .send()
                .await?;
        }

        Ok(())
    }

    pub async fn move_objects(
        &self,
        bucket_name: &str,
        keys: Vec<String>,
        destination_prefix: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut handles: Vec<JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>> =
            Vec::new();

        for key in keys {
            let client_clone = self.client.clone();
            let bucket_name_clone = bucket_name.to_string();
            let destination_prefix_clone = destination_prefix.to_string();

            let handle = tokio::spawn(async move {
                let filename = key.rsplit('/').next().unwrap_or(&key);

                let destination_key = if destination_prefix_clone.is_empty() {
                    filename.to_string()
                } else if destination_prefix_clone.ends_with('/') {
                    format!("{}{}", destination_prefix_clone, filename)
                } else {
                    format!("{}/{}", destination_prefix_clone, filename)
                };

                client_clone
                    .copy_object()
                    .bucket(&bucket_name_clone)
                    .copy_source(format!("{}/{}", bucket_name_clone, key))
                    .key(&destination_key)
                    .send()
                    .await?;

                client_clone
                    .delete_object()
                    .bucket(&bucket_name_clone)
                    .key(&key)
                    .send()
                    .await?;

                Ok(())
            });

            handles.push(handle);
        }

        for handle in handles {
            match handle.await {
                Ok(move_result) => move_result?,
                Err(e) => {
                    eprintln!("Task panicked: {}", e);
                    return Err(format!("Task panicked: {}", e).into());
                }
            }
        }

        Ok(())
    }
}
