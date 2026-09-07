import { useState } from "react";
import { useSnippets } from "../../hooks/useSnippets";
import { useStore } from "../../store";
import { useT } from "../../lib/i18n";
import { IconX } from "../icons";

export function SnippetModal() {
  const { code, language, project, setCode, setActiveSnippetId, toggleSnippetModal } = useStore();
  const { saveSnippet } = useSnippets();
  const t = useT();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await saveSnippet({ id: "", name: name.trim(), code, language, createdAt: "", updatedAt: "", projectPath: project?.path ?? null, projectType: project?.type ?? null });
    setCode("");
    setActiveSnippetId(null);
    setSaving(false);
    toggleSnippetModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") toggleSnippetModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="panel w-[360px]">
        <div className="panel-head">
          <h2 className="panel-title">{t("snippet.title")}</h2>
          <button onClick={toggleSnippetModal} className="btn btn-invisible btn-sm btn-icon" title={t("settings.close")}>
            <IconX />
          </button>
        </div>

        <div className="px-4 py-4">
          <label className="block text-[13px] font-medium text-gray-300 mb-1.5">{t("snippet.name")}</label>
          <input
            autoFocus
            className="input input-lg"
            placeholder={t("snippet.placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="mt-2 hint font-mono truncate">
            {language.toUpperCase()} · {code.trim().split("\n")[0]?.slice(0, 50) ?? ""}
          </p>
        </div>

        <div className="panel-foot">
          <button onClick={toggleSnippetModal} className="btn btn-default">{t("snippet.cancel")}</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="btn btn-primary">
            {saving ? t("snippet.saving") : t("snippet.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
