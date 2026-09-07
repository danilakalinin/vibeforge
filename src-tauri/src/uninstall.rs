use std::io::Write;
use std::process::{Command, Stdio};
use tauri::AppHandle;

#[tauri::command]
pub async fn uninstall_app(app: AppHandle) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    return Err("Uninstall is only supported on macOS".to_string());

    #[cfg(target_os = "macos")]
    uninstall_macos(app).await
}

#[cfg(target_os = "macos")]
async fn uninstall_macos(app: AppHandle) -> Result<(), String> {
    use std::os::unix::process::CommandExt;

    let pid = std::process::id();
    let script_path = std::env::temp_dir().join("vibeforge-uninstall.sh");

    let script = format!(
        r#"#!/bin/sh
PARENT_PID={pid}
i=0
while kill -0 "$PARENT_PID" 2>/dev/null && [ $i -lt 60 ]; do
  sleep 0.5
  i=$((i + 1))
done
sleep 1
rm -rf -- \
  "$HOME/.vibeforge" \
  "$HOME/Library/WebKit/dev.vibeforge.app" \
  "$HOME/Library/Caches/dev.vibeforge.app" \
  "$HOME/Library/Application Support/dev.vibeforge.app" \
  "$HOME/Library/Preferences/dev.vibeforge.app.plist" \
  "$HOME/Library/Saved Application State/dev.vibeforge.app.savedState" \
  "$HOME/Library/HTTPStorages/dev.vibeforge.app" \
  "$HOME/Library/HTTPStorages/dev.vibeforge.app.binarycookies" \
  "/Applications/VibeForge.app"
rm -- "$0"
"#
    );

    {
        let mut file = std::fs::File::create(&script_path).map_err(|e| e.to_string())?;
        file.write_all(script.as_bytes()).map_err(|e| e.to_string())?;
        use std::os::unix::fs::PermissionsExt;
        let meta = file.metadata().map_err(|e| e.to_string())?;
        let mut perms = meta.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
    }

    // Spawn detached helper — process_group(0) puts the child in its own
    // process group so it isn't killed when the parent exits.
    Command::new("/bin/sh")
        .arg(&script_path)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .process_group(0)
        .spawn()
        .map_err(|e| e.to_string())?;

    app.exit(0);
    Ok(())
}
