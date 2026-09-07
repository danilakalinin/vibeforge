use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize, Deserialize)]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize)]
pub struct AiToken {
    pub text: String,
    pub done: bool,
    pub error: Option<String>,
}

fn emit_done(app: &AppHandle, error: Option<String>) {
    let _ = app.emit("ai-token", AiToken { text: String::new(), done: true, error });
}

fn emit_text(app: &AppHandle, text: String) {
    let _ = app.emit("ai-token", AiToken { text, done: false, error: None });
}

fn parse_claude_line(line: &str) -> Option<String> {
    let data = line.strip_prefix("data: ")?;
    let v: serde_json::Value = serde_json::from_str(data).ok()?;
    v["delta"]["text"].as_str().map(|s| s.to_string())
}

fn parse_openai_line(line: &str) -> Option<String> {
    let data = line.strip_prefix("data: ")?;
    if data == "[DONE]" { return None; }
    let v: serde_json::Value = serde_json::from_str(data).ok()?;
    v["choices"][0]["delta"]["content"].as_str().map(|s| s.to_string())
}

async fn stream_sse(
    app: &AppHandle,
    response: reqwest::Response,
    parser: fn(&str) -> Option<String>,
) -> Result<(), String> {
    let mut stream = response.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim_end_matches('\r').to_string();
            buf = buf[pos + 1..].to_string();
            if let Some(text) = parser(&line) {
                if !text.is_empty() {
                    emit_text(app, text);
                }
            }
        }
    }

    Ok(())
}

async fn call_claude(
    app: &AppHandle,
    messages: Vec<AiChatMessage>,
    api_key: String,
    model: String,
    system: String,
) -> Result<(), String> {
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "stream": true,
        "system": system,
        "messages": messages.iter().map(|m| serde_json::json!({
            "role": m.role, "content": m.content,
        })).collect::<Vec<_>>(),
    });

    let resp = Client::new()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("anthropic-dangerous-direct-browser-access", "true")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Claude request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Claude {}: {}", status, text));
    }

    stream_sse(app, resp, parse_claude_line).await
}

async fn call_openai_compat(
    app: &AppHandle,
    messages: Vec<AiChatMessage>,
    api_key: String,
    model: String,
    system: String,
    endpoint: &str,
) -> Result<(), String> {
    let mut all = vec![serde_json::json!({ "role": "system", "content": system })];
    for m in &messages {
        all.push(serde_json::json!({ "role": m.role, "content": m.content }));
    }

    let mut req = Client::new()
        .post(endpoint)
        .bearer_auth(&api_key)
        .header("content-type", "application/json");

    // OpenRouter uses these for app-attribution rankings; other providers ignore them.
    if endpoint.contains("openrouter") {
        req = req
            .header("HTTP-Referer", "https://danilakalinin.github.io/vibeforge/")
            .header("X-Title", "VibeForge");
    }

    let resp = req
        .json(&serde_json::json!({ "model": model, "stream": true, "messages": all }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API {}: {}", status, text));
    }

    stream_sse(app, resp, parse_openai_line).await
}

fn build_system(language: &str, project_type: Option<&str>, code_context: Option<&str>) -> String {
    let lang = match language { "ts" => "TypeScript", "php" => "PHP", _ => "JavaScript" };
    let proj = match project_type {
        Some("laravel") => " The user has linked a Laravel project — use Eloquent, facades, and helpers freely.",
        Some("node")    => " The user has linked a Node.js project — require() resolves from the project root.",
        Some("php")     => " The user has linked a PHP/Composer project.",
        _               => "",
    };
    let code_ctx = match code_context.filter(|c| !c.trim().is_empty()) {
        Some(code) => format!(
            "\n\nCurrent editor code (you may extend or modify this based on the user's request):\n```{}\n{}\n```",
            language, code
        ),
        None => String::new(),
    };
    format!(
        "You are an AI coding assistant inside VibeForge, a {lang} scratchpad tool.{proj}{code_ctx}\n\n\
         Rules:\n\
         - Asked to WRITE CODE → respond with ONLY raw code, no markdown fences, no prose.\n\
         - Asked a QUESTION or for EXPLANATION → respond naturally; wrap code in ```{language} fences.\n\
         - Keep code concise and directly runnable as a script.",
        lang = lang, proj = proj, code_ctx = code_ctx, language = language,
    )
}

#[tauri::command]
pub async fn ai_complete(
    app: AppHandle,
    messages: Vec<AiChatMessage>,
    provider: String,
    api_key: String,
    model: String,
    language: String,
    project_type: Option<String>,
    code_context: Option<String>,
) -> Result<(), String> {
    let system = build_system(&language, project_type.as_deref(), code_context.as_deref());

    let result = match provider.as_str() {
        "claude" => call_claude(&app, messages, api_key, model, system).await,
        "openai" => call_openai_compat(&app, messages, api_key, model, system, "https://api.openai.com/v1/chat/completions").await,
        "groq" => call_openai_compat(&app, messages, api_key, model, system, "https://api.groq.com/openai/v1/chat/completions").await,
        "deepseek" => call_openai_compat(&app, messages, api_key, model, system, "https://api.deepseek.com/v1/chat/completions").await,
        "openrouter" => call_openai_compat(&app, messages, api_key, model, system, "https://openrouter.ai/api/v1/chat/completions").await,
        p => Err(format!("Unknown provider: {}", p)),
    };

    match &result {
        Ok(_) => emit_done(&app, None),
        Err(e) => emit_done(&app, Some(e.clone())),
    }

    result
}
