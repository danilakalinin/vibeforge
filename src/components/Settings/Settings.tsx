import { useRef, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useStore } from "../../store";
import { THEMES, applyDomTheme, resolveThemeId, syncWindowVibrancy } from "../../lib/themes";
import { LOCALES, resolveLocale, useT } from "../../lib/i18n";
import { IconX } from "../icons";
import type { AiProvider, Settings } from "../../types";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  openrouter: "anthropic/claude-3.5-sonnet",
};

const KEY_PLACEHOLDERS: Record<AiProvider, string> = {
  claude: "sk-ant-…",
  openai: "sk-…",
  groq: "gsk_…",
  deepseek: "sk-…",
  openrouter: "sk-or-…",
};

export function SettingsPanel() {
  const { toggleSettings, setSettings } = useStore();
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const [local, setLocal] = useState<Settings>({ ...settings });
  const [saving, setSaving] = useState(false);

  // Theme and language preview live, so remember what to roll back to on Cancel.
  const openedWith = useRef({ theme: settings.theme, locale: settings.locale });

  // No effect syncing `local` from the store: the panel remounts on every open,
  // and previewTheme() writes to the store — re-syncing would wipe unsaved edits.

  const update = (partial: Partial<Settings>) =>
    setLocal((prev) => ({ ...prev, ...partial }));

  /** Applies a setting to the live app immediately, without persisting it yet. */
  const preview = (partial: Partial<Settings>) => {
    update(partial);
    setSettings({ ...settings, ...partial });
    if (partial.theme) {
      applyDomTheme(partial.theme);
      void syncWindowVibrancy(partial.theme);
    }
  };

  const handleCancel = () => {
    preview(openedWith.current);
    toggleSettings();
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(local);
    openedWith.current = { theme: local.theme, locale: local.locale };
    setSaving(false);
    toggleSettings();
  };

  const provider = local.aiProvider;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="panel w-[460px] max-h-[85vh] flex flex-col">
        <div className="panel-head shrink-0">
          <h2 className="panel-title">{t("settings.title")}</h2>
          <button onClick={handleCancel} className="btn btn-invisible btn-sm btn-icon" title={t("settings.close")}>
            <IconX />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <Section title={t("settings.appearance")}>
            <Field label={t("settings.theme")}>
              <select
                value={resolveThemeId(local.theme)}
                onChange={(e) => preview({ theme: e.target.value })}
                className="input w-[190px]"
              >
                <optgroup label={t("settings.themeGlass")}>
                  {THEMES.filter((t) => t.glass).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t("settings.themeDark")}>
                  {THEMES.filter((t) => t.type === "dark" && !t.glass).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t("settings.themeLight")}>
                  {THEMES.filter((t) => t.type === "light" && !t.glass).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              </select>
            </Field>

            <Field label={t("settings.language")} hint={t("settings.languageHint")}>
              <select
                value={resolveLocale(local.locale)}
                onChange={(e) => preview({ locale: e.target.value })}
                className="input w-[190px]"
              >
                {LOCALES.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            <Field label={t("settings.fontSize")} hint={t("settings.fontSizeHint")}>
              <div className="seg">
                <button
                  onClick={() => update({ fontSize: Math.max(10, local.fontSize - 1) })}
                  className="seg-item w-6 justify-center text-sm"
                >
                  −
                </button>
                <span className="w-8 text-center text-[13px] text-gray-200 tabular-nums">{local.fontSize}</span>
                <button
                  onClick={() => update({ fontSize: Math.min(28, local.fontSize + 1) })}
                  className="seg-item w-6 justify-center text-sm"
                >
                  +
                </button>
              </div>
            </Field>
          </Section>

          <Section title={t("settings.execution")}>
            <Field label={t("settings.autoRun")}>
              <Toggle value={local.autoRun} onChange={(v) => update({ autoRun: v })} />
            </Field>

            {local.autoRun && (
              <Field label={t("settings.autoRunDelay")} hint={t("settings.autoRunDelayHint")}>
                <input
                  type="number"
                  value={local.autoRunDelay}
                  onChange={(e) => update({ autoRunDelay: Math.max(100, Number(e.target.value)) })}
                  className="input w-[90px] text-right tabular-nums"
                />
              </Field>
            )}

            <Field label={t("settings.historyLimit")}>
              <select
                value={local.historyLimit}
                onChange={(e) => update({ historyLimit: Number(e.target.value) })}
                className="input w-[140px]"
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>{t("settings.runs", { n })}</option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title={t("settings.runtimes")}>
            <Stacked label={t("settings.nodePath")} hint={t("settings.autoDetect")}>
              <input
                type="text"
                value={local.nodePath ?? ""}
                onChange={(e) => update({ nodePath: e.target.value || null })}
                placeholder="/opt/homebrew/bin/node"
                className="input input-lg font-mono"
              />
            </Stacked>

            <Stacked label={t("settings.phpPath")} hint={t("settings.autoDetect")}>
              <input
                type="text"
                value={local.phpPath ?? ""}
                onChange={(e) => update({ phpPath: e.target.value || null })}
                placeholder="/opt/homebrew/bin/php"
                className="input input-lg font-mono"
              />
            </Stacked>
          </Section>

          <Section title={t("settings.ai")} last>
            <Field label={t("settings.provider")}>
              <select
                value={provider ?? ""}
                onChange={(e) => {
                  const next = (e.target.value as AiProvider) || null;
                  update({ aiProvider: next, aiModel: next ? DEFAULT_MODELS[next] : null });
                }}
                className="input w-[190px]"
              >
                <option value="">{t("settings.providerNone")}</option>
                <option value="claude">Claude (Anthropic)</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq (free tier)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </Field>

            {provider && (
              <>
                <Stacked label={t("settings.apiKey")}>
                  <input
                    type="password"
                    value={local.aiApiKey ?? ""}
                    onChange={(e) => update({ aiApiKey: e.target.value || null })}
                    placeholder={KEY_PLACEHOLDERS[provider]}
                    className="input input-lg font-mono"
                  />
                </Stacked>

                <Stacked label={t("settings.model")}>
                  <input
                    type="text"
                    value={local.aiModel ?? ""}
                    onChange={(e) => update({ aiModel: e.target.value || null })}
                    placeholder={DEFAULT_MODELS[provider]}
                    className="input input-lg font-mono"
                  />
                </Stacked>
              </>
            )}
          </Section>
        </div>

        <div className="panel-foot shrink-0">
          <button onClick={handleCancel} className="btn btn-default">{t("settings.cancel")}</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={last ? "" : "mb-5 pb-5 border-b border-surface-600"}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Label on the left, control on the right. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] text-gray-200">{label}</div>
        {hint && <div className="hint mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Label above a full-width control. */
function Stacked({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] text-gray-200 mb-1.5">
        {label}
        {hint && <span className="hint ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
        value ? "bg-brand-500 border-brand-500" : "bg-surface-600 border-surface-500"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
          value ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}
