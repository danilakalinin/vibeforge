import { useCallback, useEffect, useState } from "react";
import { AiChat } from "./components/AiChat/AiChat";
import { Console } from "./components/Console/Console";
import { Editor } from "./components/Editor/Editor";
import { PackageManager } from "./components/PackageManager/PackageManager";
import { ResizeHandle } from "./components/ResizeHandle/ResizeHandle";
import { SettingsPanel } from "./components/Settings/Settings";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { SnippetModal } from "./components/SnippetModal/SnippetModal";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { useExecution } from "./hooks/useExecution";
import { useExecutionListeners } from "./hooks/useExecutionListeners";
import { useHistory } from "./hooks/useHistory";
import { useMenuListener } from "./hooks/useMenuListener";
import { useSettings } from "./hooks/useSettings";
import { applyDomTheme, syncWindowVibrancy } from "./lib/themes";
import { useSnippets } from "./hooks/useSnippets";
import { useStore } from "./store";
import type { Language } from "./types";

const CONSOLE_MIN_PCT = 15;
const CONSOLE_MAX_PCT = 75;
const EDITOR_MIN_PCT = 25;

export default function App() {
  const {
    code, language, setCode,
    sidebarOpen, packagesOpen, settingsOpen, snippetModalOpen, consoleLayout, aiChatOpen,
    clearOutput,
  } = useStore();
  const { run } = useExecution();
  const { loadSnippets } = useSnippets();
  const { loadSettings, settings, updateSettings } = useSettings();
  const { loadHistory } = useHistory();

  useExecutionListeners();
  useMenuListener();

  // console width % (side layout) / console height % (below layout)
  const [consolePct, setConsolePct] = useState(42);

  useEffect(() => {
    loadSettings();
    loadSnippets();
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyDomTheme(settings.theme);
    void syncWindowVibrancy(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "e") {
        e.preventDefault();
        clearOutput();
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) });
      } else if (e.key === "-") {
        e.preventDefault();
        updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearOutput, updateSettings, settings.fontSize]);

  const handleRun = useCallback(
    (codeArg?: string, langArg?: Language) => run(codeArg ?? code, langArg ?? language),
    [run, code, language]
  );

  // Cmd+R to run when the Monaco editor doesn't have focus (Monaco handles it internally when it does)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "r") return;
      if (document.querySelector(".monaco-editor.focused")) return;
      e.preventDefault();
      handleRun();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun]);

  const handleHorizontalResize = useCallback((delta: number) => {
    setConsolePct((prev) => {
      const containerWidth = document.documentElement.clientWidth;
      const deltaPct = (delta / containerWidth) * 100;
      return Math.min(CONSOLE_MAX_PCT, Math.max(CONSOLE_MIN_PCT, prev - deltaPct));
    });
  }, []);

  const handleVerticalResize = useCallback((delta: number) => {
    setConsolePct((prev) => {
      const containerHeight = document.documentElement.clientHeight;
      const deltaPct = (delta / containerHeight) * 100;
      // Negative: dragging handle DOWN pushes boundary down → editor grows, console shrinks
      return Math.min(CONSOLE_MAX_PCT, Math.max(CONSOLE_MIN_PCT, prev - deltaPct));
    });
  }, []);

  const editorPct = 100 - consolePct;

  return (
    <div className="flex flex-col h-screen bg-surface-900 text-gray-200">
      <Toolbar onRun={handleRun} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {sidebarOpen && <Sidebar onRun={handleRun} />}

        {consoleLayout === "side" ? (
          <>
            <div className="overflow-hidden min-w-0" style={{ flex: `${100 - consolePct} 1 0%` }}>
              <Editor onRun={handleRun} />
            </div>

            <ResizeHandle direction="horizontal" onResize={handleHorizontalResize} />

            <div className="overflow-hidden" style={{ flex: `${consolePct} 1 0%`, minWidth: `${CONSOLE_MIN_PCT}%` }}>
              <Console />
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <div className="overflow-hidden" style={{ flex: `${editorPct} 1 0%`, minHeight: `${EDITOR_MIN_PCT}%` }}>
              <Editor onRun={handleRun} />
            </div>

            <ResizeHandle direction="vertical" onResize={handleVerticalResize} />

            <div className="overflow-hidden" style={{ flex: `${consolePct} 1 0%`, minHeight: `${CONSOLE_MIN_PCT}%` }}>
              <Console />
            </div>
          </div>
        )}
      </div>

      {aiChatOpen && (
        <div className="shrink-0 border-t border-surface-600" style={{ height: "280px" }}>
          <AiChat onInsertCode={setCode} />
        </div>
      )}

      {packagesOpen && <PackageManager />}
      {settingsOpen && <SettingsPanel />}
      {snippetModalOpen && <SnippetModal />}
    </div>
  );
}
