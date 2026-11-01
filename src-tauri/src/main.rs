#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// MatinDesk desktop shell — loads the MatinDesk server (registration, accurate
// statistics, sync and GitHub backup all run server-side).
//
// The server URL lives in tauri.conf.json → app.windows[0].url and defaults to
// http://localhost:3000 . Override it at build time, e.g.:
//   MATINDESK_URL=https://your-server.example.com ./build.sh
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running MatinDesk");
}
