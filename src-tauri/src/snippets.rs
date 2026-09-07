use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub code: String,
    pub language: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "projectPath", default)]
    pub project_path: Option<String>,
    #[serde(rename = "projectType", default)]
    pub project_type: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct HistoryEntry {
    pub id: String,
    pub code: String,
    pub language: String,
    #[serde(rename = "ranAt")]
    pub ran_at: String,
    #[serde(rename = "projectPath", default)]
    pub project_path: Option<String>,
    #[serde(rename = "projectType", default)]
    pub project_type: Option<String>,
}

fn db_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let dir = PathBuf::from(home).join(".vibeforge");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("snippets.db"))
}

fn open_db() -> Result<Connection, String> {
    let conn = Connection::open(db_path()?).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'js',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'js',
            ran_at TEXT NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;
    // Migrate existing installs — ignore error if column already exists
    let _ = conn.execute_batch("ALTER TABLE history ADD COLUMN project_path TEXT");
    let _ = conn.execute_batch("ALTER TABLE history ADD COLUMN project_type TEXT");
    let _ = conn.execute_batch("ALTER TABLE snippets ADD COLUMN project_path TEXT");
    let _ = conn.execute_batch("ALTER TABLE snippets ADD COLUMN project_type TEXT");
    Ok(conn)
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub fn get_snippets() -> Result<Vec<Snippet>, String> {
    let conn = open_db()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, code, language, created_at, updated_at, project_path, project_type
             FROM snippets ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Snippet {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                language: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                project_path: row.get(6)?,
                project_type: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.map(|r| r.map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, _>>()
}

#[tauri::command]
pub fn save_snippet(snippet: Snippet) -> Result<Snippet, String> {
    let mut snippet = snippet;
    let conn = open_db()?;
    let now = now_iso();
    if snippet.id.is_empty() {
        snippet.id = uuid::Uuid::new_v4().to_string();
        snippet.created_at = now.clone();
    }
    snippet.updated_at = now;
    conn.execute(
        "INSERT INTO snippets (id, name, code, language, created_at, updated_at, project_path, project_type)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, code = excluded.code,
           language = excluded.language, updated_at = excluded.updated_at,
           project_path = excluded.project_path, project_type = excluded.project_type",
        params![
            snippet.id,
            snippet.name,
            snippet.code,
            snippet.language,
            snippet.created_at,
            snippet.updated_at,
            snippet.project_path,
            snippet.project_type,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(snippet)
}

#[tauri::command]
pub fn delete_snippet(id: String) -> Result<(), String> {
    let conn = open_db()?;
    conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_history(limit: u32) -> Result<Vec<HistoryEntry>, String> {
    let conn = open_db()?;
    let mut stmt = conn
        .prepare("SELECT id, code, language, ran_at, project_path, project_type FROM history ORDER BY ran_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                code: row.get(1)?,
                language: row.get(2)?,
                ran_at: row.get(3)?,
                project_path: row.get(4)?,
                project_type: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.map(|r| r.map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, _>>()
}

#[tauri::command]
pub fn save_history_entry(entry: HistoryEntry, limit: u32) -> Result<HistoryEntry, String> {
    let mut entry = entry;
    let conn = open_db()?;
    entry.id = uuid::Uuid::new_v4().to_string();
    entry.ran_at = now_iso();
    conn.execute(
        "INSERT INTO history (id, code, language, ran_at, project_path, project_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![entry.id, entry.code, entry.language, entry.ran_at, entry.project_path, entry.project_type],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM history WHERE id NOT IN (
            SELECT id FROM history ORDER BY ran_at DESC LIMIT ?1
        )",
        params![limit],
    )
    .map_err(|e| e.to_string())?;
    Ok(entry)
}

#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    let conn = open_db()?;
    conn.execute("DELETE FROM history", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_snippet(id: &str, name: &str) -> Snippet {
        Snippet {
            id: id.to_string(),
            name: name.to_string(),
            code: "console.log(1)".to_string(),
            language: "js".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            project_path: None,
            project_type: None,
        }
    }

    #[test]
    fn snippet_serde_camel_case() {
        let s = make_snippet("id1", "Test");
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"createdAt\""));
        assert!(json.contains("\"updatedAt\""));
    }

    #[test]
    fn snippet_round_trip_json() {
        let original = make_snippet("abc", "Round Trip");
        let json = serde_json::to_string(&original).unwrap();
        let restored: Snippet = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.id, "abc");
        assert_eq!(restored.name, "Round Trip");
        assert_eq!(restored.language, "js");
    }
}
