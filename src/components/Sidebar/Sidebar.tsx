import { useState } from "react";
import { useHistory } from "../../hooks/useHistory";
import { useSnippets } from "../../hooks/useSnippets";
import { useStore } from "../../store";
import { useT } from "../../lib/i18n";
import { IconCheck, IconPlay, IconPlus, IconX } from "../icons";
import type { HistoryEntry, Language, ProjectType, Snippet } from "../../types";

interface Props {
  onRun: (code: string, lang: Language) => void;
}

type Tab = "snippets" | "history";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function codePreview(code: string, max = 38): string {
  const first = code.trim().split("\n")[0] ?? "";
  return first.length > max ? first.slice(0, max) + "…" : first;
}

export function Sidebar({ onRun }: Props) {
  const {
    snippets,
    setCode,
    setLanguage,
    activeSnippetId,
    setActiveSnippetId,
    history,
    searchQuery,
    setSearchQuery,
    setProject,
  } = useStore();
  const { saveSnippet, deleteSnippet } = useSnippets();
  const { clearHistory } = useHistory();
  const t = useT();

  const [tab, setTab] = useState<Tab>("snippets");
  const [savingHistoryId, setSavingHistoryId] = useState<string | null>(null);
  const [historySnippetName, setHistorySnippetName] = useState("");

  const q = searchQuery.toLowerCase();

  const filteredSnippets = snippets.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  );

  const filteredHistory = history.filter(
    (h) => !q || h.code.toLowerCase().includes(q)
  );

  const handleLoad = (s: Snippet) => {
    setCode(s.code);
    setLanguage(s.language as Language);
    setActiveSnippetId(s.id);
    if (s.projectPath && s.projectType) {
      setProject({ path: s.projectPath, type: s.projectType as ProjectType });
    }
  };

  const handleRunSnippet = (e: React.MouseEvent, s: Snippet) => {
    e.stopPropagation();
    handleLoad(s);
    onRun(s.code, s.language as Language);
  };

  const handleDelete = (e: React.MouseEvent, s: Snippet) => {
    e.stopPropagation();
    deleteSnippet(s.id);
    if (activeSnippetId === s.id) setActiveSnippetId(null);
  };

  const handleRunHistory = (e: React.MouseEvent, h: HistoryEntry) => {
    e.stopPropagation();
    setCode(h.code);
    setLanguage(h.language);
    setActiveSnippetId(null);
    if (h.projectPath && h.projectType) {
      setProject({ path: h.projectPath, type: h.projectType as ProjectType });
    }
    onRun(h.code, h.language);
  };

  const handleStartSaveHistory = (e: React.MouseEvent, h: HistoryEntry) => {
    e.stopPropagation();
    setSavingHistoryId(h.id);
    setHistorySnippetName("");
  };

  const handleConfirmSaveHistory = async (h: HistoryEntry) => {
    if (!historySnippetName.trim()) return;
    await saveSnippet({
      id: "",
      name: historySnippetName.trim(),
      code: h.code,
      language: h.language,
      createdAt: "",
      updatedAt: "",
      projectPath: h.projectPath ?? null,
      projectType: h.projectType ?? null,
    });
    setSavingHistoryId(null);
    setHistorySnippetName("");
    setTab("snippets");
  };

  return (
    <aside className="w-60 flex flex-col border-r border-surface-600 bg-surface-800 shrink-0">
      {/* Search */}
      <div className="px-2.5 pt-2.5 pb-2">
        <input
          className="input"
          placeholder={t("sidebar.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs — GitHub underline nav */}
      <div className="flex gap-1 px-2.5 border-b border-surface-600">
        {(["snippets", "history"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-2.5 pb-2 pt-1 text-[13px] transition-colors after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full ${
              tab === id
                ? "font-semibold text-gray-100 after:bg-brand-400"
                : "text-gray-500 hover:text-gray-200 after:bg-transparent"
            }`}
          >
            {id === "snippets" ? t("sidebar.snippets") : t("sidebar.history")}
          </button>
        ))}
      </div>

      {/* Snippets tab */}
      {tab === "snippets" && (
        <div className="flex-1 overflow-y-auto">
          {filteredSnippets.length === 0 ? (
            <p className="hint px-3 py-4">
              {q ? t("sidebar.noMatches") : t("sidebar.noSnippets")}
            </p>
          ) : (
            <div className="p-1.5">
              {filteredSnippets.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleLoad(s)}
                  className={`group flex items-center gap-2 h-8 pl-2 pr-1 rounded-md cursor-pointer transition-colors ${
                    activeSnippetId === s.id
                      ? "bg-brand-900 text-gray-100"
                      : "hover:bg-surface-700"
                  }`}
                  title={t("sidebar.loadTitle")}
                >
                  <span className={`shrink-0 text-[10px] font-mono font-semibold w-6 ${activeSnippetId === s.id ? "text-brand-300" : "text-gray-500"}`}>
                    {s.language.toUpperCase()}
                  </span>
                  <span className="flex-1 text-[13px] text-gray-200 truncate">{s.name}</span>
                  <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleRunSnippet(e, s)} className="btn btn-invisible btn-sm btn-icon" title={t("sidebar.run")}>
                      <IconPlay />
                    </button>
                    <button onClick={(e) => handleDelete(e, s)} className="btn btn-danger btn-sm btn-icon" title={t("sidebar.delete")}>
                      <IconX />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="hint px-3 py-4">
              {q ? t("sidebar.noMatches") : t("sidebar.noHistory")}
            </p>
          ) : (
            <>
              <div className="p-1.5">
                {filteredHistory.map((h) => (
                  <div key={h.id} className="group rounded-md hover:bg-surface-700 transition-colors">
                    {savingHistoryId === h.id ? (
                      <div className="flex items-center gap-1 p-1">
                        <input
                          autoFocus
                          className="input h-6 text-xs"
                          placeholder={t("sidebar.snippetName")}
                          value={historySnippetName}
                          onChange={(e) => setHistorySnippetName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmSaveHistory(h);
                            if (e.key === "Escape") setSavingHistoryId(null);
                          }}
                        />
                        <button
                          onClick={() => handleConfirmSaveHistory(h)}
                          disabled={!historySnippetName.trim()}
                          className="btn btn-primary btn-sm btn-icon"
                          title={t("sidebar.saveAsSnippet")}
                        >
                          <IconCheck />
                        </button>
                        <button
                          onClick={() => setSavingHistoryId(null)}
                          className="btn btn-invisible btn-sm btn-icon"
                          title={t("sidebar.cancel")}
                        >
                          <IconX />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 h-8 pl-2 pr-1">
                        <span className="shrink-0 text-[10px] font-mono font-semibold text-gray-500 w-6">
                          {h.language.toUpperCase()}
                        </span>
                        <span className="flex-1 text-xs text-gray-400 truncate font-mono">
                          {codePreview(h.code)}
                        </span>
                        <span className="hint shrink-0 tabular-nums group-hover:hidden">
                          {formatTime(h.ranAt)}
                        </span>
                        <span className="hidden group-hover:flex items-center">
                          <button onClick={(e) => handleRunHistory(e, h)} className="btn btn-invisible btn-sm btn-icon" title={t("sidebar.run")}>
                            <IconPlay />
                          </button>
                          <button onClick={(e) => handleStartSaveHistory(e, h)} className="btn btn-invisible btn-sm btn-icon" title={t("sidebar.saveAsSnippet")}>
                            <IconPlus />
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-2.5 pb-2.5">
                <button onClick={clearHistory} className="btn btn-danger btn-sm w-full">
                  {t("sidebar.clearHistory")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
