import { useEffect, useRef, useState } from "react";
import { tauriClient } from "../../lib/tauri";
import { useStore } from "../../store";
import { useT } from "../../lib/i18n";
import { IconX } from "../icons";

interface NpmResult {
  name: string;
  version: string;
  description: string;
}

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";

export function PackageManager() {
  const { packages, setPackages, togglePackages } = useStore();
  const t = useT();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NpmResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tauriClient.listPackages().then(setPackages).catch(() => {});
  }, [setPackages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchNpm = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${NPM_SEARCH}?text=${encodeURIComponent(q)}&size=8`);
        const data = await res.json() as { objects: { package: NpmResult }[] };
        const results = data.objects.map((o) => o.package);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    searchNpm(value);
  };

  const selectSuggestion = (name: string) => {
    setQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const refresh = async () => {
    const updated = await tauriClient.listPackages();
    setPackages(updated);
  };

  const handleInstall = async (nameOverride?: string) => {
    const name = (nameOverride ?? query).trim();
    if (!name) return;
    setLoading(true);
    setShowSuggestions(false);
    setStatus(t("pkg.installing", { name }));
    try {
      await tauriClient.installPackage(name);
      await refresh();
      setStatus(t("pkg.installed", { name }));
      setQuery("");
      setSuggestions([]);
    } catch (err) {
      setStatus(t("pkg.error", { msg: String(err) }));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (name: string) => {
    setLoading(true);
    setStatus(t("pkg.removing", { name }));
    try {
      await tauriClient.removePackage(name);
      await refresh();
      setStatus(t("pkg.removed", { name }));
    } catch (err) {
      setStatus(t("pkg.error", { msg: String(err) }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="panel w-[520px]">
        <div className="panel-head">
          <h2 className="panel-title">{t("pkg.title")}</h2>
          <button onClick={togglePackages} className="btn btn-invisible btn-sm btn-icon" title={t("settings.close")}>
            <IconX />
          </button>
        </div>

        <div className="px-4 py-4">
          <div ref={wrapperRef} className="relative mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="input input-lg"
                  placeholder={t("pkg.search")}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { handleInstall(); setShowSuggestions(false); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  autoFocus
                />
                {searching && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hint animate-pulse">
                    {t("pkg.searching")}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleInstall()}
                disabled={loading || !query.trim()}
                className="btn btn-primary h-8"
              >
                {t("pkg.install")}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="popover absolute top-full left-0 right-0 z-10 mt-1 overflow-hidden"
                style={{ maxHeight: "260px", overflowY: "auto" }}>
                {suggestions.map((pkg) => (
                  <button
                    key={pkg.name}
                    className="group w-full text-left px-3 py-2 hover:bg-surface-700 flex items-start gap-3 border-b border-surface-700 last:border-0 transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(pkg.name); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-brand-300">{pkg.name}</span>
                        <span className="hint shrink-0 font-mono">{pkg.version}</span>
                      </div>
                      {pkg.description && (
                        <p className="hint truncate mt-0.5">{pkg.description}</p>
                      )}
                    </div>
                    <span className="hint shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">↵</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {status && (
            <p className="hint font-mono mb-3">{status}</p>
          )}

          <div className="max-h-56 overflow-y-auto -mx-1 px-1">
            {packages.length === 0 ? (
              <p className="hint text-center py-6">{t("pkg.empty")}</p>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="group flex items-center justify-between h-9 px-2 -mx-2 rounded-md hover:bg-surface-700 transition-colors"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[13px] text-gray-200 truncate">{pkg.name}</span>
                    <span className="hint font-mono shrink-0">{pkg.version}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(pkg.name)}
                    disabled={loading}
                    className="btn btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t("pkg.remove")}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
