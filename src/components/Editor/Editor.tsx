import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useExecution } from "../../hooks/useExecution";
import { useSnippets } from "../../hooks/useSnippets";
import { tauriClient } from "../../lib/tauri";
import { getTheme, registerMonacoThemes } from "../../lib/themes";
import { useStore } from "../../store";
import { useT } from "../../lib/i18n";
import { IconArrowDown, IconArrowUp } from "../icons";
import type { Language } from "../../types";

let phpProvidersRegistered = false;
let _projectClasses: string[] = [];

export function setEditorProjectClasses(classes: string[]) {
  _projectClasses = classes;
}

function registerPhpProviders(monaco: Parameters<OnMount>[1]) {
  if (phpProvidersRegistered) return;
  phpProvidersRegistered = true;

  const K = monaco.languages.CompletionItemKind;

  const facades = [
    "Auth", "Cache", "Config", "Cookie", "Crypt", "DB", "Event", "File",
    "Gate", "Hash", "Http", "Log", "Mail", "Notification", "Queue",
    "Redirect", "Redis", "Request", "Response", "Route", "Schema",
    "Session", "Storage", "URL", "Validator", "View",
  ];

  const helpers = [
    ["abort", "abort($code, $message = '')"],
    ["app", "app($abstract = null)"],
    ["asset", "asset($path, $secure = null)"],
    ["auth", "auth($guard = null)"],
    ["back", "back($status = 302)"],
    ["bcrypt", "bcrypt($value)"],
    ["blank", "blank($value)"],
    ["broadcast", "broadcast($event = null)"],
    ["cache", "cache($key = null, $default = null)"],
    ["collect", "collect($value = null)"],
    ["config", "config($key = null, $default = null)"],
    ["cookie", "cookie($name = null, $value = null, $minutes = 0)"],
    ["csrf_field", "csrf_field()"],
    ["csrf_token", "csrf_token()"],
    ["dd", "dd(...$vars)"],
    ["dispatch", "dispatch($job)"],
    ["dump", "dump(...$vars)"],
    ["env", "env($key, $default = null)"],
    ["event", "event(...$args)"],
    ["filled", "filled($value)"],
    ["info", "info($message, $context = [])"],
    ["logger", "logger($message = null, $context = [])"],
    ["method_field", "method_field($method)"],
    ["now", "now($tz = null)"],
    ["old", "old($key = null, $default = null)"],
    ["optional", "optional($value = null)"],
    ["policy", "policy($class)"],
    ["redirect", "redirect($to = null, $status = 302)"],
    ["report", "report($exception)"],
    ["request", "request($key = null, $default = null)"],
    ["rescue", "rescue(callable $callback, $rescue = null)"],
    ["resolve", "resolve($name)"],
    ["response", "response($content = '', $status = 200, $headers = [])"],
    ["retry", "retry($times, callable $callback, $sleep = 0)"],
    ["route", "route($name, $parameters = [], $absolute = true)"],
    ["session", "session($key = null)"],
    ["tap", "tap($value, $callback = null)"],
    ["throw_if", "throw_if($condition, $exception, ...$parameters)"],
    ["throw_unless", "throw_unless($condition, $exception, ...$parameters)"],
    ["today", "today($tz = null)"],
    ["trans", "trans($key = null, $replace = [], $locale = null)"],
    ["url", "url($path = null, $parameters = [], $secure = null)"],
    ["validator", "validator($data = [], $rules = [])"],
    ["value", "value($value)"],
    ["view", "view($view = null, $data = [], $mergeData = [])"],
    ["with", "with($value, callable $callback = null)"],
    ["__", "__(string $key, array $replace = [], string $locale = null)"],
  ];

  const phpFunctions = [
    "array_chunk", "array_combine", "array_diff", "array_fill", "array_filter",
    "array_flip", "array_keys", "array_map", "array_merge", "array_pop",
    "array_push", "array_reverse", "array_search", "array_shift", "array_slice",
    "array_splice", "array_unique", "array_values", "base64_decode", "base64_encode",
    "count", "date", "explode", "file_get_contents", "file_put_contents",
    "floatval", "gettype", "implode", "in_array", "intval", "is_array",
    "is_null", "is_numeric", "is_string", "isset", "json_decode", "json_encode",
    "ltrim", "max", "min", "nl2br", "number_format", "ob_end_clean", "ob_start",
    "preg_match", "preg_replace", "print_r", "rand", "round", "rtrim",
    "sizeof", "sort", "sprintf", "str_contains", "str_ends_with", "str_pad",
    "str_repeat", "str_replace", "str_split", "str_starts_with", "strftime",
    "strip_tags", "strlen", "strpos", "strtolower", "strtoupper", "substr",
    "time", "trim", "unset", "var_dump", "var_export",
  ];

  monaco.languages.registerCompletionItemProvider("php", {
    triggerCharacters: ["\\", "$", ">", ":"],

    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const defaultRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Detect namespace prefix: e.g. "App\Mo" or "App\Models\"
      const textBefore = model
        .getLineContent(position.lineNumber)
        .substring(0, position.column - 1);
      const nsMatch = textBefore.match(/([A-Z][A-Za-z0-9_]*(?:\\[A-Za-z0-9_]*)*)$/);
      const nsPrefix = nsMatch ? nsMatch[1] : "";
      const nsRange = nsPrefix
        ? {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column - nsPrefix.length,
            endColumn: word.endColumn,
          }
        : null;

      const suggestions = [
        // Project classes (models, controllers, etc.) — namespace-aware
        ..._projectClasses
          .filter((cls) =>
            nsPrefix
              ? cls.toLowerCase().includes(nsPrefix.toLowerCase())
              : true
          )
          .map((cls) => {
            const shortName = cls.split("\\").pop() ?? cls;
            return {
              label: cls,
              kind: K.Class,
              insertText: cls,
              filterText: cls,
              detail: shortName,
              documentation: "Project class",
              range: nsRange ?? defaultRange,
              sortText: "0" + cls, // float project classes to top
            };
          }),

        ...facades.map((f) => ({
          label: f,
          kind: K.Class,
          insertText: f + "::",
          documentation: `Laravel ${f} facade`,
          range: defaultRange,
          sortText: "1" + f,
        })),
        ...helpers.map(([name, sig]) => ({
          label: name,
          kind: K.Function,
          insertText: name,
          detail: sig,
          documentation: `Laravel helper`,
          range: defaultRange,
          sortText: "2" + name,
        })),
        ...phpFunctions.map((f) => ({
          label: f,
          kind: K.Function,
          insertText: f,
          documentation: `PHP built-in`,
          range: defaultRange,
          sortText: "3" + f,
        })),
      ];

      return { suggestions };
    },
  });

  monaco.languages.registerDocumentFormattingEditProvider("php", {
    provideDocumentFormattingEdits: async (model) => {
      const code = model.getValue();
      const formatted = await tauriClient.formatPhp(code);
      return [{ range: model.getFullModelRange(), text: formatted }];
    },
  });
}

function defineThemes(monaco: Parameters<OnMount>[1]) {
  // Glass themes: the editor carries the panel's single translucent tint
  // itself (matching --surface-900 / --surface-a in index.css) rather than
  // letting a fully transparent Monaco surface sit over a tinted container.
  // A 0-alpha editor background makes WebKit skip clearing between paints in
  // the vibrant Tauri window, which smears glyphs and line numbers on scroll.
  monaco.editor.defineTheme("glass-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1012188c",
      "editorGutter.background": "#1012188c",
      "minimap.background": "#00000000",
      "editor.lineHighlightBackground": "#ffffff0d",
      "editorLineNumber.foreground": "#ffffff40",
      "editorLineNumber.activeForeground": "#ffffffb0",
      "editorCursor.foreground": "#58a6ff",
      "editor.selectionBackground": "#58a6ff33",
    },
  });
  monaco.editor.defineTheme("glass-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#f8f9fcc7",
      "editorGutter.background": "#f8f9fcc7",
      "minimap.background": "#00000000",
      "editor.lineHighlightBackground": "#0000000a",
      "editorLineNumber.foreground": "#00000040",
      "editorLineNumber.activeForeground": "#000000b0",
      "editorCursor.foreground": "#0969da",
      "editor.selectionBackground": "#0969da22",
    },
  });
}

interface Props {
  onRun: (code: string, lang: Language) => void;
}

const LANG_LABEL: Record<Language, string> = { js: "JavaScript", ts: "TypeScript", php: "PHP" };

export function Editor({ onRun }: Props) {
  const { code, language, setCode, setActiveSnippetId, clearOutput, settings, activeSnippetId, snippets, toggleSnippetModal } = useStore();
  const { scheduleAutoRun, cancelAutoRun } = useExecution();
  const { saveSnippet } = useSnippets();
  const t = useT();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editorAtBottom, setEditorAtBottom] = useState(true);
  const [editorAtTop, setEditorAtTop] = useState(true);

  const theme = getTheme(settings.theme).monacoId;

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    defineThemes(monaco);
    registerMonacoThemes(monaco);
    registerPhpProviders(monaco);
    monaco.editor.setTheme(theme);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      onRun(editor.getValue(), language)
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () =>
      onRun(editor.getValue(), language)
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => editor.getAction("editor.action.formatDocument")?.run()
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRef.current().catch(() => {});
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
      handleNewRef.current();
    });
    // Toggle find: addAction overrides Monaco's built-in Cmd+F keybinding
    editor.addAction({
      id: "vibeforge.toggleFind",
      label: "Toggle Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => {
        const widget = editor.getDomNode()?.querySelector(".find-widget");
        if (widget?.classList.contains("visible")) {
          editor.trigger("keyboard", "closeFindWidget", null);
          editor.focus();
        } else {
          editor.trigger("keyboard", "actions.find", null);
        }
      },
    });

    editor.onDidScrollChange(() => {
      const scrollTop = editor.getScrollTop();
      const scrollHeight = editor.getScrollHeight();
      const height = editor.getLayoutInfo().height;
      setEditorAtTop(scrollTop < 50);
      setEditorAtBottom(scrollHeight - scrollTop - height < 50);
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      // Capture-phase Escape so it fires before WebView swallows it
      domNode.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const widget = domNode.querySelector(".find-widget");
        if (widget?.classList.contains("visible")) {
          e.stopPropagation();
          editor.trigger("keyboard", "closeFindWidget", null);
          editor.focus();
        }
      }, true);

      // Strip native OS tooltips from Monaco's find widget
      const stripTitles = () => {
        domNode.querySelectorAll(".find-widget [title]").forEach((el) => {
          el.removeAttribute("title");
        });
      };
      const observer = new MutationObserver(stripTitles);
      observer.observe(domNode, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
    }
  };

  const handleChange = (value: string | undefined) => {
    const next = value ?? "";
    setCode(next);
    scheduleAutoRun(next, language);
  };

  const handleClear = () => {
    cancelAutoRun();
    clearOutput();
    setCode("");
    setActiveSnippetId(null);
    setFormatError(null);
  };

  const handleCopy = async () => {
    if (!code.trim()) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleNew = useCallback(() => {
    cancelAutoRun();
    clearOutput();
    setCode("");
    setActiveSnippetId(null);
    setFormatError(null);
    setSaved(false);
  }, [cancelAutoRun, clearOutput, setCode, setActiveSnippetId]);

  const handleNewRef = useRef(handleNew);
  useEffect(() => { handleNewRef.current = handleNew; }, [handleNew]);

  const handleSave = useCallback(async () => {
    if (!activeSnippetId) {
      toggleSnippetModal();
      return;
    }
    const snippet = snippets.find((s) => s.id === activeSnippetId);
    if (!snippet) return;
    await saveSnippet({ ...snippet, code, language });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeSnippetId, snippets, code, language, saveSnippet, toggleSnippetModal]);

  // Stable ref so the Cmd+S Monaco command always calls the latest handleSave
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const handleFormat = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setFormatting(true);
    setFormatError(null);
    try {
      await editor.getAction("editor.action.formatDocument")?.run();
    } catch (err) {
      setFormatError(String(err));
    } finally {
      setFormatting(false);
    }
  };

  // Menu-driven triggers dispatched by useMenuListener as CustomEvents.
  useEffect(() => {
    const onFormat = () => { handleFormat().catch(() => {}); };
    const onClear  = () => { handleClear(); };
    const onCopy   = () => { handleCopy().catch(() => {}); };
    const onNew    = () => { handleNew(); };
    window.addEventListener("vibeforge:format",       onFormat);
    window.addEventListener("vibeforge:clear-editor", onClear);
    window.addEventListener("vibeforge:copy-code",    onCopy);
    window.addEventListener("vibeforge:new-scratch",  onNew);
    return () => {
      window.removeEventListener("vibeforge:format",       onFormat);
      window.removeEventListener("vibeforge:clear-editor", onClear);
      window.removeEventListener("vibeforge:copy-code",    onCopy);
      window.removeEventListener("vibeforge:new-scratch",  onNew);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <div className="bar bg-surface-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bar-title">{LANG_LABEL[language]}</span>
          {activeSnippetId && (
            <span className="badge bg-surface-700 border-surface-600 text-gray-400 max-w-[160px] truncate">
              {snippets.find((s) => s.id === activeSnippetId)?.name ?? "snippet"}
            </span>
          )}
          {formatError && (
            <span className="text-xs text-red-400 max-w-[220px] truncate" title={formatError}>
              {formatError}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleNew} className="btn btn-invisible btn-sm" title={t("editor.newTitle")}>
            {t("editor.new")}
          </button>
          <button
            onClick={handleCopy}
            disabled={!code.trim()}
            className="btn btn-invisible btn-sm"
            title={t("editor.copyTitle")}
          >
            {copied ? t("editor.copied") : t("editor.copy")}
          </button>
          <button
            onClick={handleFormat}
            disabled={!code.trim() || formatting}
            className="btn btn-invisible btn-sm"
            title={t("editor.formatTitle")}
          >
            {formatting ? t("editor.formatting") : t("editor.format")}
          </button>
          <button
            onClick={handleClear}
            disabled={!code.trim()}
            className="btn btn-invisible btn-sm"
          >
            {t("editor.clear")}
          </button>
          <button
            onClick={() => handleSave().catch(() => {})}
            disabled={!code.trim()}
            className="btn btn-default btn-sm ml-1"
            title={activeSnippetId ? t("editor.updateTitle") : t("editor.saveTitle")}
          >
            {saved ? t("editor.saved") : activeSnippetId ? t("editor.update") : t("editor.save")}
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language === "ts" ? "typescript" : language === "php" ? "php" : "javascript"}
          value={code}
          theme={theme}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontSize: settings.fontSize,
            fontFamily: "JetBrains Mono, Fira Code, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            folding: true,
            foldingStrategy: "auto",
            showFoldingControls: "always",
          }}
        />
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
          {!editorAtTop && (
            <button
              onClick={() => { editorRef.current?.setScrollTop(0); setEditorAtTop(true); }}
              className="btn btn-default btn-icon rounded-full shadow-lg"
              title={t("editor.scrollTop")}
            >
              <IconArrowUp />
            </button>
          )}
          {!editorAtBottom && (
            <button
              onClick={() => {
                const editor = editorRef.current;
                const model = editor?.getModel();
                if (editor && model) editor.revealLine(model.getLineCount(), 0);
                setEditorAtBottom(true);
              }}
              className="btn btn-default btn-icon rounded-full shadow-lg"
              title={t("editor.scrollBottom")}
            >
              <IconArrowDown />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
