mod s3_service;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

pub use s3_service::S3Service;

use crate::s3::s3_service::S3ServiceConfig;

pub type ConnectionMap = Arc<Mutex<HashMap<String, ConnectionConfig>>>;

#[derive(Serialize, Deserialize, Type, Clone)]
pub struct Connection {
    id: String,
    label: String,
    provider: BucketProvider,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct CommonConfig {
    pub label: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct R2Config {
    pub common: CommonConfig,
    pub account_id: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct S3Config {
    pub common: CommonConfig,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct CustomConfig {
    pub common: CommonConfig,
    pub endpoint_url: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub enum ConnectionConfig {
    S3(S3Config),
    R2(R2Config),
    Custom(CustomConfig),
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct SavedS3Config {
    pub common: CommonConfig,
    pub uuid: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct SavedR2Config {
    pub common: CommonConfig,
    pub account_id: String,
    pub uuid: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct SavedCustomConfig {
    pub common: CommonConfig,
    pub endpoint_url: String,
    pub uuid: String,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub enum SavedConnectionConfig {
    S3(SavedS3Config),
    R2(SavedR2Config),
    Custom(SavedCustomConfig),
}

#[derive(Serialize, Deserialize, Type, Debug, Clone, PartialEq)]
pub enum BucketProvider {
    S3,
    R2,
    Custom,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct BucketInfo {
    pub provider: BucketProvider,
    pub name: String,
    pub region: String,
    pub endpoint_url: String,
    pub creation_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct ObjectInfo {
    pub key: String,
    pub size: Option<i64>,
    pub last_modified: Option<String>,
    pub storage_class: Option<String>,
    pub is_folder: bool,
}

#[derive(Serialize, Deserialize, Type)]
pub struct CommonOperationOptions {
    connection: Connection,
    bucket_region: Option<String>,
}

fn build_service_config(
    config: ConnectionConfig,
    bucket_region: Option<String>,
) -> S3ServiceConfig {
    match config {
        ConnectionConfig::S3(s3_config) => {
            let region = bucket_region.unwrap_or_else(|| "us-east-1".to_string());

            S3ServiceConfig {
                config: s3_config,
                region: region.clone(),
                endpoint_url: format!("https://s3.{}.amazonaws.com", region),
                provider: BucketProvider::S3,
            }
        }
        ConnectionConfig::R2(r2_config) => {
            let account_id = r2_config.account_id.clone();

            S3ServiceConfig {
                config: S3Config {
                    common: r2_config.common,
                },
                region: "auto".to_string(),
                endpoint_url: format!("https://{}.r2.cloudflarestorage.com", account_id),
                provider: BucketProvider::R2,
            }
        }
        ConnectionConfig::Custom(custom_config) => S3ServiceConfig {
            config: S3Config {
                common: custom_config.common,
            },
            region: "auto".to_string(),
            endpoint_url: custom_config.endpoint_url,
            provider: BucketProvider::Custom,
        },
    }
}

async fn create_s3_service(
    opts: &CommonOperationOptions,
    state: State<'_, ConnectionMap>,
) -> Result<S3Service, String> {
    let connections = state.lock().await;
    let config = connections
        .get(&opts.connection.id)
        .ok_or_else(|| "Connection not found".to_string())?
        .clone();

    let service_config = build_service_config(config, opts.bucket_region.clone());

    S3Service::new(service_config)
        .await
        .map_err(|e| format!("Failed to init S3 service: {}", e))
}

async fn create_service_from_config(
    config: ConnectionConfig,
    bucket_region: Option<String>,
) -> Result<S3Service, String> {
    let service_config = build_service_config(config, bucket_region);

    S3Service::new(service_config)
        .await
        .map_err(|e| format!("Failed to init S3 service: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn connect_to_s3(
    config: ConnectionConfig,
    state: State<'_, ConnectionMap>,
) -> Result<Connection, String> {
    let id = Uuid::new_v4().to_string();

    let connection = match &config {
        ConnectionConfig::S3(s3_config) => Connection {
            id: id.clone(),
            label: s3_config.common.label.clone(),
            provider: BucketProvider::S3,
        },
        ConnectionConfig::R2(r2_config) => Connection {
            id: id.clone(),
            label: r2_config.common.label.clone(),
            provider: BucketProvider::R2,
        },
        ConnectionConfig::Custom(custom_config) => Connection {
            id: id.clone(),
            label: custom_config.common.label.clone(),
            provider: BucketProvider::Custom,
        },
    };

    let service = create_service_from_config(config.clone(), None).await?;

    service
        .list_buckets()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let mut connections = state.lock().await;
    connections.insert(id, config);

    Ok(connection)
}

#[tauri::command]
#[specta::specta]
pub async fn list_buckets(
    connection: Connection,
    state: State<'_, ConnectionMap>,
) -> Result<Vec<BucketInfo>, String> {
    let options = CommonOperationOptions {
        connection,
        bucket_region: None,
    };

    let service = create_s3_service(&options, state).await?;

    service
        .list_buckets()
        .await
        .map_err(|e| format!("Failed to list buckets: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct ListObjectsOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    prefix: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn list_objects(
    opts: ListObjectsOptions,
    state: State<'_, ConnectionMap>,
) -> Result<Vec<ObjectInfo>, String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .list_objects(&opts.bucket_name, opts.prefix.as_deref(), false)
        .await
        .map_err(|e| format!("Failed to list objects: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct DownloadObjectOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    key: String,
}

#[tauri::command]
#[specta::specta]
pub async fn download_object(
    opts: DownloadObjectOptions,
    state: State<'_, ConnectionMap>,
) -> Result<Vec<u8>, String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .download_object(&opts.bucket_name, &opts.key)
        .await
        .map_err(|e| format!("Failed to download object: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct DownloadObjectsOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    keys: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn download_objects(
    opts: DownloadObjectsOptions,
    state: State<'_, ConnectionMap>,
) -> Result<Vec<(String, Vec<u8>)>, String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .download_objects(&opts.bucket_name, opts.keys)
        .await
        .map_err(|e| format!("Failed to download objects: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct DeleteObjectsOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    keys: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn delete_objects(
    opts: DeleteObjectsOptions,
    state: State<'_, ConnectionMap>,
) -> Result<(), String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .delete_objects(&opts.bucket_name, opts.keys)
        .await
        .map_err(|e| format!("Failed to delete objects: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct DownloadFolderOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    prefix: String,
}

#[tauri::command]
#[specta::specta]
pub async fn download_folder(
    opts: DownloadFolderOptions,
    state: State<'_, ConnectionMap>,
) -> Result<Vec<u8>, String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .download_folder(&opts.bucket_name, &opts.prefix)
        .await
        .map_err(|e| format!("Failed to download folder: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct UploadObjectsOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    prefix: Option<String>,
    file_paths: Vec<PathBuf>,
}

#[tauri::command]
#[specta::specta]
pub async fn upload_objects(
    opts: UploadObjectsOptions,
    state: State<'_, ConnectionMap>,
) -> Result<(), String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .upload_objects(&opts.bucket_name, opts.prefix, opts.file_paths)
        .await
        .map_err(|e| format!("Failed to download objects: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct CreateFolderOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    folder_key: String,
}

#[tauri::command]
#[specta::specta]
pub async fn create_folder(
    opts: CreateFolderOptions,
    state: State<'_, ConnectionMap>,
) -> Result<(), String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .create_folder(&opts.bucket_name, &opts.folder_key)
        .await
        .map_err(|e| format!("Failed to create folder: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct DeleteFolderOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    prefix: String,
}

#[tauri::command]
#[specta::specta]
pub async fn delete_folder(
    opts: DeleteFolderOptions,
    state: State<'_, ConnectionMap>,
) -> Result<(), String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .delete_folder(&opts.bucket_name, &opts.prefix)
        .await
        .map_err(|e| format!("Failed to delete folder: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct MoveObjectsOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    keys: Vec<String>,
    destination_prefix: String,
}

#[tauri::command]
#[specta::specta]
pub async fn move_objects(
    opts: MoveObjectsOptions,
    state: State<'_, ConnectionMap>,
) -> Result<(), String> {
    let service = create_s3_service(&opts.common, state).await?;

    service
        .move_objects(&opts.bucket_name, opts.keys, &opts.destination_prefix)
        .await
        .map_err(|e| format!("Failed to move objects: {}", e))
}

#[derive(Serialize, Deserialize, Type)]
pub struct GetObjectUrlOptions {
    common: CommonOperationOptions,
    bucket_name: String,
    key: String,
}

#[tauri::command]
#[specta::specta]
pub async fn get_object_url(
    opts: GetObjectUrlOptions,
    state: State<'_, ConnectionMap>,
) -> Result<String, String> {
    let service = create_s3_service(&opts.common, state).await?;

    Ok(service.get_object_url(&opts.bucket_name, &opts.key, opts.common.bucket_region))
}
