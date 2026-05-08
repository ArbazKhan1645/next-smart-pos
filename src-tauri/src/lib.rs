// Smart POS — Tauri backend
//
// Architecture note:
// This file is the backend entry point. Currently it boots the webview
// and serves the React frontend. Future phases will add:
//   - SQLite database via tauri-plugin-sql
//   - IPC commands for POS operations (billing, inventory, etc.)
//   - Background services (sync, print queue, etc.)
//
// Keep this file lean — move feature logic into separate modules
// under src/ as the backend grows.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Only enable logging in debug builds to keep release lean
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── Future: initialize services here ──
            // e.g. database connection, print queue, sync worker

            Ok(())
        })
        // ── Future: register IPC commands here ──
        // .invoke_handler(tauri::generate_handler![
        //     commands::get_products,
        //     commands::create_order,
        //     commands::sync_inventory,
        // ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
