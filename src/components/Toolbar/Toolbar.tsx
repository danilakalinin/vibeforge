import { useEffect } from "react";
import { useStore } from "../../store";
import { tauriClient } from "../../lib/tauri";
import { setEditorProjectClasses } from "../Editor/Editor";
import { useExecution } from "../../hooks/useExecution";
import { useSettings } from "../../hooks/useSettings";
import { useT } from "../../lib/i18n";
import { IconPlay, IconX } from "../icons";
import type { Language, ProjectType } from "../../types";

interface Props { onRun: (code?: string, lang?: Language) => void }

const IconLayoutSide = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="12" height="12" rx="1.5" />
    <line x1="7.5" y1="1" x2="7.5" y2="13" />
  </svg>
);

const IconLayoutBelow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="12" height="12" rx="1.5" />
    <line x1="1" y1="7.5" x2="13" y2="7.5" />
  </svg>
);

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  laravel: "Laravel",
  node: "Node",
  php: "PHP",
  unknown: "Project",
};

/** GitHub-style label: tinted 10% fill, matching 30% border, saturated text. */
function projectBadge(type: ProjectType) {
  if (type === "laravel") return "bg-red-500/10 border-red-500/30 text-red-400";
  if (type === "node") return "bg-green-500/10 border-green-500/30 text-green-400";
  if (type === "php") return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
  return "bg-surface-600 border-surface-500 text-gray-400";
}

export function Toolbar({ onRun }: Props) {
  const {
    language, setLanguage, isRunning, settings, code,
    consoleLayout, project, setProject, clearOutput, aiChatOpen,
    toggleSidebar, togglePackages, toggleSettings, toggleConsoleLayout, toggleSnippetModal, toggleAiChat,
    activeSnippetId, setActiveSnippetId, setCode,
  } = useStore();
  const { updateSettings } = useSettings();
  const { cancelAutoRun } = useExecution();
  const t = useT();

  useEffect(() => {
    const onLink = () => { handleLinkProject().catch(() => {}); };
    const onUnlink = () => {
      setProject(null);
      updateSettings({ projectPath: null, projectType: null });
      setEditorProjectClasses([]);
    };
    window.addEventListener("vibeforge:link-project", onLink);
    window.addEventListener("vibeforge:unlink-project", onUnlink);
    return () => {
      window.removeEventListener("vibeforge:link-project", onLink);
      window.removeEventListener("vibeforge:unlink-project", onUnlink);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageSwitch = (lang: Language) => {
    if (lang === language) return;
    cancelAutoRun();
    clearOutput();
    if (activeSnippetId) {
      setCode("");
      setActiveSnippetId(null);
    }
    setLanguage(lang);
  };

  const handleLinkProject = async () => {
    const path = await tauriClient.selectDirectory();
    if (!path) return;
    const type = await detectProjectType(path);
    setProject({ path, type });
    updateSettings({ projectPath: path, projectType: type });
    if (type === "laravel" || type === "php") {
      tauriClient.getProjectClasses(path)
        .then((classes) => setEditorProjectClasses(classes))
        .catch(() => {});
    }
  };

  const handleUnlinkProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProject(null);
    updateSettings({ projectPath: null, projectType: null });
    setEditorProjectClasses([]);
  };

  const projectName = project ? project.path.split("/").pop() ?? project.path : null;

  return (
    <header className="flex items-center gap-2 px-3 h-11 border-b border-surface-600 bg-surface-800 shrink-0">
      <span className="text-[13px] font-semibold text-gray-100 tracking-tight mr-1 select-none">
        VibeForge
      </span>

      <span className="w-px h-4 bg-surface-600 mx-0.5" />

      <button
        onClick={toggleSidebar}
        className="btn btn-invisible btn-icon"
        title={t("toolbar.library")}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="13" height="13" rx="2.5" />
          <line x1="5.5" y1="1" x2="5.5" y2="14" />
        </svg>
      </button>

      <button
        onClick={toggleSnippetModal}
        disabled={!code.trim()}
        className="btn btn-invisible"
        title={t("toolbar.newSnippetTitle")}
      >
        {t("toolbar.newSnippet")}
      </button>

      <div className="seg" role="tablist" aria-label={t("toolbar.codeLanguage")}>
        {(["js", "ts", "php"] as Language[]).map((lang) => (
          <button
            key={lang}
            role="tab"
            aria-selected={language === lang}
            onClick={() => handleLanguageSwitch(lang)}
            className={`seg-item ${language === lang ? "seg-item-on" : ""}`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="hint">{settings.autoRun ? t("toolbar.autoRun") : t("toolbar.manual")}</span>

      {/* Project linker */}
      {project ? (
        <div className="flex items-center gap-1.5">
          <span className={`badge ${projectBadge(project.type)}`}>
            {PROJECT_TYPE_LABEL[project.type]}
          </span>
          <span className="text-xs text-gray-300 max-w-[130px] truncate" title={project.path}>
            {projectName}
          </span>
          <button
            onClick={handleUnlinkProject}
            className="btn btn-danger btn-sm btn-icon"
            title={t("toolbar.unlinkProject")}
          >
            <IconX />
          </button>
        </div>
      ) : (
        <button
          onClick={handleLinkProject}
          className="btn btn-invisible"
          title={t("toolbar.linkProjectTitle")}
        >
          {t("toolbar.linkProject")}
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleAiChat}
        aria-pressed={aiChatOpen}
        className={`btn btn-icon ${aiChatOpen ? "btn-default text-brand-300 border-brand-500/40 bg-brand-900" : "btn-invisible"}`}
        title={t("toolbar.aiChat")}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3l2 2 2-2h4a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
        </svg>
      </button>

      <button
        onClick={toggleConsoleLayout}
        className="btn btn-invisible btn-icon"
        title={consoleLayout === "side" ? t("toolbar.layoutBelow") : t("toolbar.layoutSide")}
      >
        {consoleLayout === "side" ? <IconLayoutBelow /> : <IconLayoutSide />}
      </button>

      <button
        onClick={togglePackages}
        className="btn btn-invisible"
        title={t("toolbar.packages")}
      >
        {t("toolbar.packages")}
      </button>

      <button
        onClick={toggleSettings}
        className="btn btn-invisible btn-icon"
        title={t("toolbar.settings")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <span className="w-px h-4 bg-surface-600 mx-0.5" />

      <button
        onClick={() => onRun()}
        disabled={isRunning}
        className="btn btn-primary"
        title={t("toolbar.runTitle")}
      >
        <IconPlay />
        {isRunning ? t("toolbar.running") : t("toolbar.run")}
      </button>
    </header>
  );
}

async function detectProjectType(path: string): Promise<import("../../types").ProjectType> {
  const { exists } = await import("@tauri-apps/plugin-fs");
  const artisan = await exists(path + "/artisan").catch(() => false);
  if (artisan) return "laravel";
  const pkgJson = await exists(path + "/package.json").catch(() => false);
  if (pkgJson) return "node";
  const composerJson = await exists(path + "/composer.json").catch(() => false);
  if (composerJson) return "php";
  return "unknown";
}
