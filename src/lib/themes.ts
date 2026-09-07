import type * as monaco from "monaco-editor";

// Theme definitions vendored from `monaco-themes` (MIT, brijeshb42/monaco-themes).
// The package doesn't expose ./themes/*.json via its "exports" map, so the files
// we use live in src/themes/. Drop a new JSON there and add a row below to extend.
import DraculaJson from "../themes/Dracula.json";
import NordJson from "../themes/Nord.json";
import NightOwlJson from "../themes/Night Owl.json";
import MonokaiJson from "../themes/Monokai.json";
import TomorrowNightJson from "../themes/Tomorrow-Night.json";
import GithubDarkJson from "../themes/GitHub Dark.json";
import SolarizedDarkJson from "../themes/Solarized-dark.json";
import OceanicNextJson from "../themes/Oceanic Next.json";
import Cobalt2Json from "../themes/Cobalt2.json";
import GithubLightJson from "../themes/GitHub Light.json";
import SolarizedLightJson from "../themes/Solarized-light.json";

export type ThemeType = "dark" | "light";

/** Native macOS window-vibrancy material, or null to clear it (solid themes). */
export type WindowEffect = "underWindowBackground" | "hudWindow" | "sidebar" | "contentBackground";

export interface ThemeDef {
  id: string;
  name: string;
  type: ThemeType;
  /** true = frosted/translucent theme paired with native window vibrancy */
  glass?: boolean;
  /** macOS vibrancy material for this theme; null clears it */
  effect: WindowEffect | null;
  /** monaco-editor theme id to activate */
  monacoId: string;
  /** payload for monaco.editor.defineTheme; null = defined elsewhere (built-in themes) */
  monacoData: monaco.editor.IStandaloneThemeData | null;
}

const data = (json: unknown) => json as monaco.editor.IStandaloneThemeData;

export const THEMES: ThemeDef[] = [
  { id: "glass-dark", name: "Glass Dark", type: "dark", glass: true, effect: "hudWindow", monacoId: "glass-dark", monacoData: null },
  { id: "glass-light", name: "Glass Light", type: "light", glass: true, effect: "underWindowBackground", monacoId: "glass-light", monacoData: null },
  { id: "dracula", name: "Dracula", type: "dark", effect: null, monacoId: "dracula", monacoData: data(DraculaJson) },
  { id: "nord", name: "Nord", type: "dark", effect: null, monacoId: "nord", monacoData: data(NordJson) },
  { id: "night-owl", name: "Night Owl", type: "dark", effect: null, monacoId: "night-owl", monacoData: data(NightOwlJson) },
  { id: "monokai", name: "Monokai", type: "dark", effect: null, monacoId: "monokai", monacoData: data(MonokaiJson) },
  { id: "tomorrow-night", name: "Tomorrow Night", type: "dark", effect: null, monacoId: "tomorrow-night", monacoData: data(TomorrowNightJson) },
  { id: "github-dark", name: "GitHub Dark", type: "dark", effect: null, monacoId: "github-dark", monacoData: data(GithubDarkJson) },
  { id: "solarized-dark", name: "Solarized Dark", type: "dark", effect: null, monacoId: "solarized-dark", monacoData: data(SolarizedDarkJson) },
  { id: "oceanic-next", name: "Oceanic Next", type: "dark", effect: null, monacoId: "oceanic-next", monacoData: data(OceanicNextJson) },
  { id: "cobalt2", name: "Cobalt2", type: "dark", effect: null, monacoId: "cobalt2", monacoData: data(Cobalt2Json) },
  { id: "github-light", name: "GitHub Light", type: "light", effect: null, monacoId: "github-light", monacoData: data(GithubLightJson) },
  { id: "solarized-light", name: "Solarized Light", type: "light", effect: null, monacoId: "solarized-light", monacoData: data(SolarizedLightJson) },
];

export const DEFAULT_THEME_ID = "glass-dark";

/** Maps legacy values (dark/light, pre-rename vibelab-*, pre-glass vibeforge-*) and unknown ids onto a real theme id. */
export function resolveThemeId(stored: string | null | undefined): string {
  if (!stored || stored === "dark" || stored === "vibelab-dark" || stored === "vibeforge-dark") return "glass-dark";
  if (stored === "light" || stored === "vibelab-light" || stored === "vibeforge-light") return "glass-light";
  return THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME_ID;
}

export function getTheme(id: string | null | undefined): ThemeDef {
  const resolved = resolveThemeId(id);
  return THEMES.find((t) => t.id === resolved) ?? THEMES[0];
}

let monacoThemesRegistered = false;

/** Registers every bundled monaco-themes payload. Safe to call repeatedly. */
export function registerMonacoThemes(m: typeof monaco): void {
  if (monacoThemesRegistered) return;
  monacoThemesRegistered = true;
  for (const t of THEMES) {
    if (t.monacoData) m.editor.defineTheme(t.monacoId, t.monacoData);
  }
}

/** Applies the app-chrome theme by flipping the <html> data-theme attribute + .dark class. */
export function applyDomTheme(id: string | null | undefined): void {
  const theme = getTheme(id);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  root.classList.toggle("dark", theme.type === "dark");
}

/**
 * Syncs the native macOS window vibrancy to the theme: glass themes get their
 * frosted material, solid themes clear it. No-op outside the Tauri runtime.
 */
export async function syncWindowVibrancy(id: string | null | undefined): Promise<void> {
  const theme = getTheme(id);
  try {
    const mod = await import("@tauri-apps/api/window");
    const win = mod.getCurrentWindow();
    if (theme.effect) {
      // The Effect/EffectState enums aren't exported; their values are these strings.
      const opts = { effects: [theme.effect], state: "active", radius: 10 } as unknown as Parameters<typeof win.setEffects>[0];
      await win.setEffects(opts);
    } else {
      await win.clearEffects();
    }
  } catch {
    /* not running under Tauri (tests, plain browser) */
  }
}
