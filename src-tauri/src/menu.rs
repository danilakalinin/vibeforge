use tauri::{AppHandle, Emitter, Runtime};
use tauri::menu::{Menu, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};

pub const WINDOW_MENU_ID: &str = "window-menu";
pub const HELP_MENU_ID: &str = "help-menu";

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let sep = || PredefinedMenuItem::separator(app);

    // ── VibeForge app menu (macOS only) ─────────────────────────────────────
    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, "VibeForge")
        .about(None)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // ── File ──────────────────────────────────────────────────────────────
    let file_menu = {
        let new_scratch = MenuItem::with_id(app, "new-scratch",      "New",                     true, Some("CmdOrCtrl+N"))?;
        let new_snippet = MenuItem::with_id(app, "new-snippet",      "Save as Snippet\u{2026}", true, None::<&str>)?;
        let link        = MenuItem::with_id(app, "link-project",     "Link Project\u{2026}",    true, Some("CmdOrCtrl+O"))?;
        let unlink      = MenuItem::with_id(app, "unlink-project",   "Unlink Project",          true, None::<&str>)?;
        let packages    = MenuItem::with_id(app, "install-packages", "Install npm Package\u{2026}", true, Some("CmdOrCtrl+Shift+P"))?;
        let settings    = MenuItem::with_id(app, "settings",         "Settings\u{2026}",        true, Some("CmdOrCtrl+,"))?;
        let quit        = PredefinedMenuItem::quit(app, Some("Quit VibeForge"))?;

        SubmenuBuilder::new(app, "File")
            .item(&new_scratch)
            .item(&new_snippet)
            .item(&link)
            .item(&unlink)
            .item(&sep()?)
            .item(&packages)
            .item(&settings)
            .item(&sep()?)
            .item(&quit)
            .build()?
    };

    // ── Edit ──────────────────────────────────────────────────────────────
    let edit_menu = {
        let undo       = PredefinedMenuItem::undo(app, None)?;
        let redo       = PredefinedMenuItem::redo(app, None)?;
        let cut        = PredefinedMenuItem::cut(app, None)?;
        let copy       = PredefinedMenuItem::copy(app, None)?;
        let paste      = PredefinedMenuItem::paste(app, None)?;
        let sel_all    = PredefinedMenuItem::select_all(app, None)?;
        let format     = MenuItem::with_id(app, "format",       "Format with Prettier", true, Some("CmdOrCtrl+Shift+F"))?;
        let clear_ed   = MenuItem::with_id(app, "clear-editor", "Clear Editor",         true, None::<&str>)?;
        let copy_code  = MenuItem::with_id(app, "copy-code",    "Copy All Code",        true, None::<&str>)?;
        let find_con   = MenuItem::with_id(app, "find-console", "Find in Console",      true, Some("CmdOrCtrl+F"))?;

        SubmenuBuilder::new(app, "Edit")
            .item(&undo)
            .item(&redo)
            .item(&sep()?)
            .item(&cut)
            .item(&copy)
            .item(&paste)
            .item(&sel_all)
            .item(&sep()?)
            .item(&format)
            .item(&clear_ed)
            .item(&copy_code)
            .item(&find_con)
            .build()?
    };

    // ── View ──────────────────────────────────────────────────────────────
    let view_menu = {
        let sidebar    = MenuItem::with_id(app, "toggle-sidebar",        "Toggle Sidebar",        true, Some("CmdOrCtrl+B"))?;
        let ai_chat    = MenuItem::with_id(app, "toggle-ai-chat",        "Toggle AI Chat",        true, Some("CmdOrCtrl+J"))?;
        let con_layout = MenuItem::with_id(app, "toggle-console-layout", "Toggle Console Layout", true, None::<&str>)?;
        let font_up    = MenuItem::with_id(app, "font-larger",           "Increase Font Size",    true, Some("CmdOrCtrl+="))?;
        let font_down  = MenuItem::with_id(app, "font-smaller",          "Decrease Font Size",    true, Some("CmdOrCtrl+-"))?;
        let clear_out  = MenuItem::with_id(app, "clear-output",          "Clear Console",         true, Some("CmdOrCtrl+E"))?;

        SubmenuBuilder::new(app, "View")
            .item(&sidebar)
            .item(&ai_chat)
            .item(&con_layout)
            .item(&sep()?)
            .item(&font_up)
            .item(&font_down)
            .item(&sep()?)
            .item(&clear_out)
            .build()?
    };

    // ── Run ───────────────────────────────────────────────────────────────
    let run_menu = {
        let run         = MenuItem::with_id(app, "run",            "Run Code",        true, Some("CmdOrCtrl+R"))?;
        let lang_js     = MenuItem::with_id(app, "lang-js",        "JavaScript",      true, Some("CmdOrCtrl+1"))?;
        let lang_ts     = MenuItem::with_id(app, "lang-ts",        "TypeScript",      true, Some("CmdOrCtrl+2"))?;
        let lang_php    = MenuItem::with_id(app, "lang-php",       "PHP",             true, Some("CmdOrCtrl+3"))?;
        let toggle_auto = MenuItem::with_id(app, "toggle-autorun", "Toggle Auto-run", true, None::<&str>)?;

        SubmenuBuilder::new(app, "Run")
            .item(&run)
            .item(&sep()?)
            .item(&lang_js)
            .item(&lang_ts)
            .item(&lang_php)
            .item(&sep()?)
            .item(&toggle_auto)
            .build()?
    };

    // ── Window ────────────────────────────────────────────────────────────
    let window_menu = {
        let minimize   = PredefinedMenuItem::minimize(app, None)?;
        let zoom       = PredefinedMenuItem::maximize(app, None)?;
        let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;
        let front      = PredefinedMenuItem::bring_all_to_front(app, None)?;

        SubmenuBuilder::with_id(app, WINDOW_MENU_ID, "Window")
            .item(&minimize)
            .item(&zoom)
            .item(&fullscreen)
            .item(&sep()?)
            .item(&front)
            .build()?
    };

    // NOTE: the Window/Help submenus are registered with AppKit in
    // register_macos_roles(), which must run *after* Tauri installs this menu as
    // the application menu — doing it here has no effect (see that function).

    // ── Help ──────────────────────────────────────────────────────────────
    let help_menu = {
        let website   = MenuItem::with_id(app, "website",      "VibeForge Website",   true, None::<&str>)?;
        let github    = MenuItem::with_id(app, "github",       "GitHub Repository", true, None::<&str>)?;
        let report    = MenuItem::with_id(app, "report-issue", "Report an Issue",   true, None::<&str>)?;
        let releases  = MenuItem::with_id(app, "releases",     "View Releases",     true, None::<&str>)?;
        let uninstall = MenuItem::with_id(app, "uninstall",    "Uninstall VibeForge\u{2026}", true, None::<&str>)?;

        SubmenuBuilder::with_id(app, HELP_MENU_ID, "Help")
            .item(&website)
            .item(&github)
            .item(&report)
            .item(&sep()?)
            .item(&releases)
            .item(&sep()?)
            .item(&uninstall)
            .build()?
    };


    // ── Assemble ──────────────────────────────────────────────────────────
    let mut builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    { builder = builder.item(&app_menu); }

    builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&run_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}

/// Hands the Window and Help submenus to AppKit so it can manage them.
///
/// This is what makes macOS add its standard "Move & Resize" group (Fill,
/// Center, halves — fn+Ctrl+F / fn+Ctrl+C / fn+Ctrl+arrows) and the live window
/// list. Those shortcuts are dispatched *as menu commands*: with no registered
/// Window menu there is nothing for them to invoke, and they silently do nothing.
///
/// Must run AFTER Tauri has installed the menu as the application menu —
/// calling it while building only tags a submenu that is about to be replaced.
#[cfg(target_os = "macos")]
pub fn register_macos_roles<R: Runtime>(app: &AppHandle<R>) {
    let Some(menu) = app.menu() else { return };
    for (id, is_window) in [(WINDOW_MENU_ID, true), (HELP_MENU_ID, false)] {
        let Some(kind) = menu.get(id) else { continue };
        let Some(submenu) = kind.as_submenu() else { continue };
        let _ = if is_window {
            submenu.set_as_windows_menu_for_nsapp()
        } else {
            submenu.set_as_help_menu_for_nsapp()
        };
    }
}

pub fn handle<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let _ = app.emit("menu-action", event.id().as_ref().to_string());
}
