use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Package {
    pub name: String,
    pub version: String,
}

fn workspace() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    Ok(PathBuf::from(home).join(".vibeforge").join("workspace"))
}

fn npm_path() -> Result<String, String> {
    let out = std::process::Command::new("sh")
        .arg("-c")
        .arg("which npm")
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !p.is_empty() {
            return Ok(p);
        }
    }
    Err("npm not found on PATH".to_string())
}

#[tauri::command]
pub async fn install_package(name: String) -> Result<String, String> {
    let npm = npm_path()?;
    let ws = workspace()?;
    std::fs::create_dir_all(&ws).map_err(|e| e.to_string())?;

    let out = std::process::Command::new(&npm)
        .args(["install", "--save", &name])
        .current_dir(&ws)
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

#[tauri::command]
pub async fn remove_package(name: String) -> Result<String, String> {
    let npm = npm_path()?;
    let ws = workspace()?;

    let out = std::process::Command::new(&npm)
        .args(["uninstall", &name])
        .current_dir(&ws)
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

#[tauri::command]
pub async fn list_packages() -> Result<Vec<Package>, String> {
    let ws = workspace()?;
    let pkg_json = ws.join("package.json");
    if !pkg_json.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(&pkg_json).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let deps = json
        .get("dependencies")
        .and_then(|d| d.as_object())
        .cloned()
        .unwrap_or_default();
    Ok(deps
        .into_iter()
        .map(|(name, version)| Package {
            name,
            version: version.as_str().unwrap_or("*").to_string(),
        })
        .collect())
}
