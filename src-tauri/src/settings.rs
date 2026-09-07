use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

fn default_history_limit() -> u32 {
    100
}

fn default_locale() -> String {
    "en".to_string()
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Settings {
    #[serde(default = "default_locale")]
    pub locale: String,
    pub theme: String,
    #[serde(rename = "fontSize")]
    pub font_size: u32,
    #[serde(rename = "autoRun")]
    pub auto_run: bool,
    #[serde(rename = "autoRunDelay")]
    pub auto_run_delay: u32,
    #[serde(rename = "envVars")]
    pub env_vars: HashMap<String, String>,
    #[serde(rename = "nodePath")]
    pub node_path: Option<String>,
    #[serde(rename = "phpPath", default)]
    pub php_path: Option<String>,
    #[serde(rename = "historyLimit", default = "default_history_limit")]
    pub history_limit: u32,
    #[serde(rename = "projectPath", default)]
    pub project_path: Option<String>,
    #[serde(rename = "projectType", default)]
    pub project_type: Option<String>,
    #[serde(rename = "aiProvider", default)]
    pub ai_provider: Option<String>,
    #[serde(rename = "aiApiKey", default)]
    pub ai_api_key: Option<String>,
    #[serde(rename = "aiModel", default)]
    pub ai_model: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            locale: default_locale(),
            theme: "glass-dark".to_string(),
            font_size: 14,
            auto_run: true,
            auto_run_delay: 500,
            env_vars: HashMap::new(),
            node_path: None,
            php_path: None,
            history_limit: 100,
            project_path: None,
            project_type: None,
            ai_provider: None,
            ai_api_key: None,
            ai_model: None,
        }
    }
}

fn settings_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let dir = PathBuf::from(home).join(".vibeforge");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path()?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_values() {
        let s = Settings::default();
        assert_eq!(s.theme, "glass-dark");
        assert_eq!(s.font_size, 14);
        assert!(s.auto_run);
        assert_eq!(s.auto_run_delay, 500);
        assert!(s.env_vars.is_empty());
        assert!(s.node_path.is_none());
        assert!(s.php_path.is_none());
    }

    #[test]
    fn settings_serialise_camel_case() {
        let s = Settings::default();
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"fontSize\""));
        assert!(json.contains("\"autoRun\""));
        assert!(json.contains("\"autoRunDelay\""));
        assert!(json.contains("\"envVars\""));
        assert!(json.contains("\"nodePath\""));
        assert!(json.contains("\"phpPath\""));
    }

    #[test]
    fn settings_round_trip() {
        let original = Settings {
            locale: "ru".to_string(),
            theme: "light".to_string(),
            font_size: 18,
            auto_run: false,
            auto_run_delay: 1000,
            env_vars: std::collections::HashMap::new(),
            node_path: Some("/usr/local/bin/node".to_string()),
            php_path: Some("/usr/bin/php".to_string()),
            history_limit: 50,
            project_path: None,
            project_type: None,
            ai_provider: None,
            ai_api_key: None,
            ai_model: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let restored: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.theme, "light");
        assert_eq!(restored.locale, "ru");
        assert_eq!(restored.font_size, 18);
        assert!(!restored.auto_run);
        assert_eq!(restored.auto_run_delay, 1000);
        assert_eq!(restored.node_path, Some("/usr/local/bin/node".to_string()));
        assert_eq!(restored.php_path, Some("/usr/bin/php".to_string()));
    }
}
