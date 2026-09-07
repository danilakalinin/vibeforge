import { useCallback } from "react";
import { setEditorProjectClasses } from "../components/Editor/Editor";
import { tauriClient } from "../lib/tauri";
import { applyDomTheme, syncWindowVibrancy } from "../lib/themes";
import { useStore } from "../store";
import type { ProjectType, Settings } from "../types";

export function useSettings() {
  const { settings, setSettings, setProject } = useStore();

  const applyTheme = (id: string) => {
    applyDomTheme(id);
    void syncWindowVibrancy(id);
  };

  const loadSettings = useCallback(async () => {
    const s = await tauriClient.getSettings();
    setSettings(s);
    applyTheme(s.theme);
    if (s.projectPath && s.projectType) {
      setProject({ path: s.projectPath, type: s.projectType as ProjectType });
      if (s.projectType === "laravel" || s.projectType === "php") {
        tauriClient.getProjectClasses(s.projectPath)
          .then((classes) => setEditorProjectClasses(classes))
          .catch(() => {});
      }
    }
  }, [setSettings, setProject]);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      try {
        await tauriClient.saveSettings(updated);
        applyTheme(updated.theme);
      } catch (err) {
        setSettings(settings);
        console.error("Failed to save settings:", err);
      }
    },
    [settings, setSettings]
  );

  return { settings, loadSettings, updateSettings };
}
