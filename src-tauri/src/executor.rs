use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize, Deserialize)]
pub struct ExecutionLine {
    pub output_type: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ExecutionDone {
    pub exit_code: Option<i32>,
}

fn is_real_node(path: &str) -> bool {
    // node --version outputs "v20.0.0"; npm outputs "9.8.1" without a leading v
    std::process::Command::new(path)
        .arg("--version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().starts_with('v'))
        .unwrap_or(false)
}

fn find_binary(cmd_name: &str, fixed_paths: &[&str]) -> Result<String, String> {
    for path in fixed_paths {
        if std::path::Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }
    // PATH lookup last — unreliable in Tauri's restricted process environment
    if let Ok(out) = std::process::Command::new("sh")
        .arg("-c")
        .arg(format!("which {0} 2>/dev/null", cmd_name))
        .output()
    {
        if out.status.success() {
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path.is_empty() && std::path::Path::new(&path).exists() {
                return Ok(path);
            }
        }
    }
    Err(format!("{} not found. Install it or set the path in Settings.", cmd_name))
}

fn find_node_path() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| String::from("/"));

    // nvm-managed versions — most common on dev machines, check newest first
    let nvm_dirs = [
        format!("{}/.nvm/versions/node", home),
        format!("{}/Library/Application Support/Herd/config/nvm/versions/node", home),
    ];

    for dir in &nvm_dirs {
        let p = std::path::Path::new(dir);
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(p) {
                let mut versions: Vec<PathBuf> =
                    entries.filter_map(|e| e.ok().map(|e| e.path())).collect();
                versions.sort();
                for version_dir in versions.iter().rev() {
                    let bin = version_dir.join("bin").join("node");
                    if bin.exists() && is_real_node(&bin.to_string_lossy()) {
                        return Ok(bin.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    // Known fixed paths — validate each is actually node, not an npm shim
    let fixed = [
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node",
    ];

    for path in &fixed {
        if std::path::Path::new(path).exists() && is_real_node(path) {
            return Ok(path.to_string());
        }
    }

    Err("Node.js not found. Open Settings and set the Node.js path, or install from https://nodejs.org".to_string())
}

fn find_php_path() -> Result<String, String> {
    find_binary("php", &["/usr/bin/php", "/usr/local/bin/php", "/opt/homebrew/bin/php"])
        .map_err(|_| "PHP not found. Install PHP or set the path in Settings.".to_string())
}

fn tinker_wrap_php(code: &str, is_laravel: bool) -> String {
    let lines: Vec<&str> = code.lines().collect();

    let last_idx = lines.iter().enumerate().rev().find(|(_, l)| {
        let t = l.trim();
        !t.is_empty() && !t.starts_with("//") && !t.starts_with("/*") && !t.starts_with('*')
    }).map(|(i, _)| i);

    let Some(idx) = last_idx else { return code.to_string(); };
    let trimmed = lines[idx].trim();

    if !trimmed.ends_with(';') { return code.to_string(); }

    let output_starters = [
        "echo ", "echo(", "print ", "print(", "dd(", "dump(", "var_dump(", "print_r(",
        "var_export(", "printf(", "fprintf(",
    ];
    if output_starters.iter().any(|p| trimmed.starts_with(p)) { return code.to_string(); }

    let skip_starters = [
        "if ", "if(", "else", "for ", "for(", "foreach ", "foreach(", "while ", "while(",
        "do ", "do{", "switch ", "return", "throw ", "}", "{", "class ", "function ",
        "public ", "private ", "protected ", "static ", "abstract ", "interface ",
        "trait ", "namespace ", "use ", "require", "include",
    ];
    if skip_starters.iter().any(|s| trimmed.starts_with(s)) { return code.to_string(); }

    if trimmed.starts_with('$') {
        let after_dollar = &trimmed[1..];
        let name_end = after_dollar.find(|c: char| !c.is_alphanumeric() && c != '_')
            .unwrap_or(after_dollar.len());
        let after_name = after_dollar[name_end..].trim_start();
        let is_assign = (after_name.starts_with('=') && !after_name.starts_with("=="))
            || after_name.starts_with(".=")
            || after_name.starts_with("+=")
            || after_name.starts_with("-=")
            || after_name.starts_with("*=")
            || after_name.starts_with("/=");
        let is_array_assign = after_name.starts_with('[') && {
            if let Some(cb) = after_name.find(']') {
                let post = after_name[cb + 1..].trim_start();
                post.starts_with('=') && !post.starts_with("==")
            } else { false }
        };
        if is_assign || is_array_assign { return code.to_string(); }
    }

    let expr = trimmed.strip_suffix(';').unwrap_or(trimmed);
    let dump_fn = if is_laravel { "dump" } else { "var_dump" };

    let mut result: Vec<String> = lines[..idx].iter().map(|s| s.to_string()).collect();
    result.push(format!("{}({});", dump_fn, expr));
    for line in &lines[idx + 1..] {
        result.push(line.to_string());
    }
    result.join("\n")
}

fn has_js_assignment(trimmed: &str) -> bool {
    let mut in_string = false;
    let mut string_char = '"';
    let mut depth: i32 = 0;
    let chars: Vec<char> = trimmed.chars().collect();

    for (i, &c) in chars.iter().enumerate() {
        if in_string {
            if c == string_char && (i == 0 || chars[i - 1] != '\\') {
                in_string = false;
            }
            continue;
        }
        match c {
            '"' | '\'' | '`' => { in_string = true; string_char = c; }
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '=' if depth == 0 => {
                let prev = if i > 0 { chars[i - 1] } else { ' ' };
                let next = if i + 1 < chars.len() { chars[i + 1] } else { ' ' };
                if prev == '!' || prev == '<' || prev == '>' || prev == '=' { continue; }
                if next == '=' || next == '>' { continue; }
                return true;
            }
            _ => {}
        }
    }
    false
}

fn tinker_wrap_node(code: &str) -> String {
    let lines: Vec<&str> = code.lines().collect();

    let last_idx = lines.iter().enumerate().rev().find(|(_, l)| {
        let t = l.trim();
        !t.is_empty() && !t.starts_with("//") && !t.starts_with("/*") && !t.starts_with('*')
    }).map(|(i, _)| i);

    let Some(idx) = last_idx else { return code.to_string(); };
    let trimmed = lines[idx].trim();

    let output_starters = ["console.", "process.stdout", "process.stderr"];
    if output_starters.iter().any(|p| trimmed.starts_with(p)) { return code.to_string(); }

    let skip_starters = [
        "const ", "let ", "var ", "function ", "async function", "class ", "import ", "export ",
        "return", "throw ", "if ", "if(", "else", "for ", "for(", "while ", "while(",
        "do ", "do{", "switch ", "}", "{",
    ];
    if skip_starters.iter().any(|s| trimmed.starts_with(s)) { return code.to_string(); }

    if has_js_assignment(trimmed) { return code.to_string(); }

    let expr = trimmed.strip_suffix(';').unwrap_or(trimmed);

    // top-level await is valid in .mjs; Promise.resolve handles both sync and async results
    let wrapped = format!(
        "{{ const __r__ = await Promise.resolve(({})); if (__r__ !== undefined) console.log(require('util').inspect(__r__, {{ depth: 10, compact: false }})); }}",
        expr
    );

    let mut result: Vec<String> = lines[..idx].iter().map(|s| s.to_string()).collect();
    result.push(wrapped);
    for line in &lines[idx + 1..] {
        result.push(line.to_string());
    }
    result.join("\n")
}

fn workspace_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let ws = PathBuf::from(home).join(".vibeforge").join("workspace");
    std::fs::create_dir_all(&ws).map_err(|e| e.to_string())?;
    let pkg = ws.join("package.json");
    if !pkg.exists() {
        std::fs::write(
            &pkg,
            r#"{"name":"vibeforge-workspace","version":"1.0.0","private":true,"dependencies":{}}"#,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(ws)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

async fn stream_process(
    app: AppHandle,
    cmd: String,
    args: Vec<String>,
    env_vars: Vec<(String, String)>,
    cwd: PathBuf,
) -> Result<(), String> {
    let mut command = Command::new(&cmd);
    command.args(&args).current_dir(&cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    for (k, v) in env_vars {
        command.env(k, v);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start {}: {}", cmd, e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_out = app.clone();
    let out_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit("execution-output", ExecutionLine {
                output_type: "stdout".into(),
                content: line,
                timestamp: now_ms(),
            });
        }
    });

    let app_err = app.clone();
    let err_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit("execution-output", ExecutionLine {
                output_type: "stderr".into(),
                content: line,
                timestamp: now_ms(),
            });
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = tokio::join!(out_task, err_task);

    app.emit("execution-done", ExecutionDone { exit_code: status.code() })
        .map_err(|e| e.to_string())?;

    Ok(())
}

async fn execute_node_code(
    app: AppHandle,
    code: String,
    language: String,
    node_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    let node_bin = match node_path.as_deref() {
        Some(p) if !p.is_empty() && std::path::Path::new(p).exists() => p.to_string(),
        _ => find_node_path()?,
    };

    let workspace = workspace_dir()?;

    let cwd = project_path.as_deref()
        .map(std::path::Path::new)
        .filter(|p| p.is_dir())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| workspace.clone());

    let suffix = if language == "ts" { ".ts" } else { ".mjs" };
    let temp = tempfile::Builder::new()
        .suffix(suffix)
        .tempfile()
        .map_err(|e| e.to_string())?;

    let require_base = format!("file://{}/_", cwd.to_string_lossy());
    let preamble = format!(
        "import {{ createRequire }} from 'module';\nconst require = createRequire('{}');\n",
        require_base
    );
    let wrapped_code = tinker_wrap_node(&code);
    std::fs::write(temp.path(), format!("{}{}", preamble, wrapped_code))
        .map_err(|e| e.to_string())?;

    let temp_path = temp.path().to_path_buf();

    let tsx_bin = workspace.join("node_modules").join(".bin").join("tsx");
    let (cmd, args): (String, Vec<String>) = if language == "ts" && tsx_bin.exists() {
        (tsx_bin.to_string_lossy().to_string(), vec![temp_path.to_string_lossy().to_string()])
    } else {
        (node_bin, vec![temp_path.to_string_lossy().to_string()])
    };

    let mut node_path_entries = vec![workspace.join("node_modules").to_string_lossy().to_string()];
    if let Some(ref proj) = project_path {
        let proj_modules = std::path::Path::new(proj).join("node_modules");
        if proj_modules.is_dir() {
            node_path_entries.insert(0, proj_modules.to_string_lossy().to_string());
        }
    }

    stream_process(app, cmd, args, vec![("NODE_PATH".into(), node_path_entries.join(":"))], cwd).await
}

async fn execute_php_code(
    app: AppHandle,
    code: String,
    php_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    let php_bin = match php_path.as_deref() {
        Some(p) if !p.is_empty() && std::path::Path::new(p).exists() => p.to_string(),
        _ => find_php_path()?,
    };

    let full_code = build_php_code(&code, project_path.as_deref());

    let temp = tempfile::Builder::new()
        .suffix(".php")
        .tempfile()
        .map_err(|e| e.to_string())?;
    std::fs::write(temp.path(), full_code).map_err(|e| e.to_string())?;

    let cwd = project_path.as_deref()
        .map(std::path::Path::new)
        .filter(|p| p.is_dir())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(std::env::temp_dir);

    stream_process(app, php_bin, vec![temp.path().to_string_lossy().to_string()], vec![], cwd).await
}

fn build_php_code(code: &str, project_path: Option<&str>) -> String {
    let Some(proj) = project_path else {
        return format!("<?php\n{}", tinker_wrap_php(code, false));
    };

    let proj_path = std::path::Path::new(proj);
    let autoload = proj_path.join("vendor").join("autoload.php");
    let is_laravel = proj_path.join("artisan").exists();
    let wrapped = tinker_wrap_php(code, is_laravel);

    if !autoload.exists() {
        return format!("<?php\n{}", wrapped);
    }

    let autoload_str = autoload.to_string_lossy();

    if is_laravel {
        let bootstrap = proj_path.join("bootstrap").join("app.php");
        format!(
            "<?php\ndefine('LARAVEL_START', microtime(true));\nrequire '{}';\n$app = require_once '{}';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n\n{}",
            autoload_str,
            bootstrap.to_string_lossy(),
            wrapped
        )
    } else {
        format!("<?php\nrequire '{}';\n\n{}", autoload_str, wrapped)
    }
}

#[tauri::command]
pub async fn execute_code(
    app: AppHandle,
    code: String,
    language: String,
    node_path: Option<String>,
    php_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    if language == "php" {
        execute_php_code(app, code, php_path, project_path).await
    } else {
        execute_node_code(app, code, language, node_path, project_path).await
    }
}
