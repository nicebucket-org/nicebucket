use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_keyring::KeyringExt;
use uuid::Uuid;

use crate::s3::{
    BucketProvider, ConnectionConfig, SavedConnectionConfig, SavedCustomConfig, SavedR2Config,
    SavedS3Config,
};

const KEYRING_SERVICE: &str = "nicebucket";
const KEYRING_INDEX_USER: &str = "saved_connections_index";

fn connection_to_saved(config: ConnectionConfig, uuid: String) -> SavedConnectionConfig {
    match config {
        ConnectionConfig::S3(s3_config) => SavedConnectionConfig::S3(SavedS3Config {
            common: s3_config.common,
            uuid,
        }),
        ConnectionConfig::R2(r2_config) => SavedConnectionConfig::R2(SavedR2Config {
            common: r2_config.common,
            account_id: r2_config.account_id,
            uuid,
        }),
        ConnectionConfig::Custom(custom_config) => {
            SavedConnectionConfig::Custom(SavedCustomConfig {
                common: custom_config.common,
                endpoint_url: custom_config.endpoint_url,
                uuid,
            })
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct SavedConnectionsIndex {
    connection_ids: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn save_connection(
    app: AppHandle<tauri::Wry>,
    config: ConnectionConfig,
) -> Result<String, String> {
    let uuid = Uuid::new_v4().to_string();

    let saved_config = connection_to_saved(config, uuid.clone());

    let config_json = serde_json::to_string(&saved_config)
        .map_err(|e| format!("Failed to serialize connection: {}", e))?;

    app.keyring()
        .set_password(KEYRING_SERVICE, &uuid, &config_json)
        .map_err(|e| format!("Failed to save to keyring: {}", e))?;

    add_to_index(&app, &uuid).await?;

    Ok(uuid)
}

#[tauri::command]
#[specta::specta]
pub async fn load_saved_connections(
    app: AppHandle<tauri::Wry>,
) -> Result<Vec<SavedConnectionConfig>, String> {
    let index = load_index(&app)
        .await
        .unwrap_or_else(|_| SavedConnectionsIndex {
            connection_ids: vec![],
        });

    let mut connections = Vec::new();

    for id in &index.connection_ids {
        let config_json = match app
            .keyring()
            .get_password(KEYRING_SERVICE, id)
            .map_err(|e| e.to_string())
        {
            Ok(Some(json)) => json,
            Ok(None) => {
                eprintln!("Connection {} not found in keyring", id);
                continue;
            }
            Err(e) => {
                eprintln!("Failed to load connection {} from keyring: {}", id, e);
                continue;
            }
        };

        match serde_json::from_str::<SavedConnectionConfig>(&config_json) {
            Ok(config) => connections.push(config),
            Err(e) => {
                eprintln!("Failed to deserialize connection {}: {}", id, e);
                continue;
            }
        }
    }

    Ok(connections)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_saved_connection(
    app: AppHandle<tauri::Wry>,
    uuid: String,
) -> Result<(), String> {
    app.keyring()
        .delete_password(KEYRING_SERVICE, &uuid)
        .map_err(|e| format!("Failed to delete from keyring: {}", e))?;

    remove_from_index(&app, &uuid).await?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn is_connection_saved(app: AppHandle<tauri::Wry>, uuid: String) -> Result<bool, String> {
    match app
        .keyring()
        .get_password(KEYRING_SERVICE, &uuid)
        .map_err(|e| e.to_string())
    {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn is_connection_duplicate(
    app: AppHandle<tauri::Wry>,
    config: ConnectionConfig,
) -> Result<bool, String> {
    let saved_connections = load_saved_connections(app).await?;

    let (provider, access_key) = match &config {
        ConnectionConfig::S3(s3_config) => (BucketProvider::S3, &s3_config.common.access_key_id),
        ConnectionConfig::R2(r2_config) => (BucketProvider::R2, &r2_config.common.access_key_id),
        ConnectionConfig::Custom(custom_config) => {
            (BucketProvider::Custom, &custom_config.common.access_key_id)
        }
    };

    for saved_config in saved_connections {
        let (saved_provider, saved_access_key) = match &saved_config {
            SavedConnectionConfig::S3(s3) => (BucketProvider::S3, &s3.common.access_key_id),
            SavedConnectionConfig::R2(r2) => (BucketProvider::R2, &r2.common.access_key_id),
            SavedConnectionConfig::Custom(custom) => {
                (BucketProvider::Custom, &custom.common.access_key_id)
            }
        };

        if provider == saved_provider && access_key == saved_access_key {
            return Ok(true);
        }
    }

    Ok(false)
}

async fn load_index(app: &AppHandle<tauri::Wry>) -> Result<SavedConnectionsIndex, String> {
    let index_json = app
        .keyring()
        .get_password(KEYRING_SERVICE, KEYRING_INDEX_USER)
        .map_err(|e| format!("Failed to load index: {}", e))?;

    match index_json {
        Some(json) => {
            serde_json::from_str(&json).map_err(|e| format!("Failed to deserialize index: {}", e))
        }
        None => Ok(SavedConnectionsIndex {
            connection_ids: vec![],
        }),
    }
}

async fn save_index(
    app: &AppHandle<tauri::Wry>,
    index: &SavedConnectionsIndex,
) -> Result<(), String> {
    let index_json =
        serde_json::to_string(index).map_err(|e| format!("Failed to serialize index: {}", e))?;

    app.keyring()
        .set_password(KEYRING_SERVICE, KEYRING_INDEX_USER, &index_json)
        .map_err(|e| format!("Failed to save index: {}", e))
}

async fn add_to_index(app: &AppHandle<tauri::Wry>, uuid: &str) -> Result<(), String> {
    let mut index = load_index(app)
        .await
        .unwrap_or_else(|_| SavedConnectionsIndex {
            connection_ids: vec![],
        });

    if !index.connection_ids.contains(&uuid.to_string()) {
        index.connection_ids.push(uuid.to_string());
        save_index(app, &index).await?;
    }

    Ok(())
}

async fn remove_from_index(app: &AppHandle<tauri::Wry>, uuid: &str) -> Result<(), String> {
    let mut index = load_index(app).await?;
    index.connection_ids.retain(|id| id != uuid);
    save_index(app, &index).await
}
