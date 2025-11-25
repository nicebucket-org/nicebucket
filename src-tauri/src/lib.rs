mod keyring;
mod s3;

use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, Builder};

fn should_set_webkit_workaround() -> bool {
    let is_appimage = std::env::var("APPIMAGE").is_ok();

    if !is_appimage {
        return false;
    }

    #[cfg(target_os = "linux")]
    {
        let info = os_info::get();
        let os_type = info.os_type();

        // check if it's not Debian or Ubuntu (Debian-based)
        !matches!(os_type, os_info::Type::Debian | os_info::Type::Ubuntu)
    }

    #[cfg(not(target_os = "linux"))]
    {
        false
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        s3::connect_to_s3,
        s3::list_buckets,
        s3::list_objects,
        s3::download_object,
        s3::download_objects,
        s3::delete_objects,
        s3::download_folder,
        s3::delete_folder,
        s3::upload_objects,
        s3::create_folder,
        s3::move_objects,
        keyring::save_connection,
        keyring::load_saved_connections,
        keyring::delete_saved_connection,
        keyring::is_connection_saved,
        keyring::is_connection_duplicate,
    ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::new().bigint(BigIntExportBehavior::Number),
            "../src/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    if should_set_webkit_workaround() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_keyring::init())
        .manage(s3::ConnectionMap::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
