mod ai;
mod executor;
mod formatter;
mod menu;
mod packages;
mod project;
mod settings;
mod snippets;
mod uninstall;

use ai::ai_complete;
use executor::execute_code;
use formatter::format_php;
use packages::{install_package, list_packages, remove_package};
use project::get_project_classes;
use settings::{get_settings, save_settings};
use snippets::{clear_history, delete_snippet, get_history, get_snippets, save_history_entry, save_snippet};
use uninstall::uninstall_app;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .menu(|app| menu::build(app))
        .on_menu_event(|app, event| menu::handle(app, event))
        .setup(|app| {
            // Only now is the menu actually installed as the application menu,
            // so this is the earliest point AppKit will accept the Window/Help
            // roles (and add its Move & Resize group to the Window menu).
            #[cfg(target_os = "macos")]
            menu::register_macos_roles(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai_complete,
            execute_code,
            format_php,
            install_package,
            remove_package,
            list_packages,
            get_snippets,
            save_snippet,
            delete_snippet,
            get_history,
            save_history_entry,
            clear_history,
            get_settings,
            save_settings,
            get_project_classes,
            uninstall_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
