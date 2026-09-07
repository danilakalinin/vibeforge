import { useEffect, useRef } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { confirm } from "@tauri-apps/plugin-dialog";
import { listenMenuAction, tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import { useExecution } from "./useExecution";
import { useSettings } from "./useSettings";

const WEBSITE  = "https://danilakalinin.github.io/vibeforge/";
const GITHUB   = "https://github.com/danilakalinin/vibeforge";
const ISSUES   = "https://github.com/danilakalinin/vibeforge/issues/new";
const RELEASES = "https://github.com/danilakalinin/vibeforge/releases";

type StoreState = ReturnType<typeof useStore.getState>;

export function useMenuListener() {
  const store = useStore();
  const { run, cancelAutoRun } = useExecution();
  const { updateSettings } = useSettings();

  // Live ref so the single-setup listener always sees fresh values.
  const ref = useRef({ store, run, cancelAutoRun, updateSettings });
  ref.current = { store, run, cancelAutoRun, updateSettings };

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    (async () => {
      const unl = await listenMenuAction((id) => {
        handleAction(id, ref.current).catch(() => {});
      });

      if (cancelled) unl();
      else unlisten = unl;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

async function handleAction(
  id: string,
  ctx: {
    store: StoreState;
    run: (code: string, lang: StoreState["language"]) => Promise<void>;
    cancelAutoRun: () => void;
    updateSettings: (patch: Partial<StoreState["settings"]>) => void;
  }
) {
  const { store, run, cancelAutoRun, updateSettings } = ctx;

  switch (id) {
    // ── File ──────────────────────────────────────────────────────────────
    case "new-scratch":      window.dispatchEvent(new CustomEvent("vibeforge:new-scratch")); break;
    case "new-snippet":      store.toggleSnippetModal(); break;
    case "link-project":     window.dispatchEvent(new CustomEvent("vibeforge:link-project")); break;
    case "unlink-project":   window.dispatchEvent(new CustomEvent("vibeforge:unlink-project")); break;
    case "install-packages": store.togglePackages(); break;
    case "settings":         store.toggleSettings(); break;

    // ── Edit ──────────────────────────────────────────────────────────────
    case "format":       window.dispatchEvent(new CustomEvent("vibeforge:format")); break;
    case "clear-editor": window.dispatchEvent(new CustomEvent("vibeforge:clear-editor")); break;
    case "copy-code":    window.dispatchEvent(new CustomEvent("vibeforge:copy-code")); break;
    case "find-console": window.dispatchEvent(new CustomEvent("vibeforge:find-console")); break;

    // ── View ──────────────────────────────────────────────────────────────
    case "toggle-sidebar":        store.toggleSidebar(); break;
    case "toggle-ai-chat":        store.toggleAiChat(); break;
    case "toggle-console-layout": store.toggleConsoleLayout(); break;
    case "clear-output":          store.clearOutput(); break;
    case "font-larger":
      updateSettings({ fontSize: Math.min(28, store.settings.fontSize + 1) });
      break;
    case "font-smaller":
      updateSettings({ fontSize: Math.max(10, store.settings.fontSize - 1) });
      break;

    // ── Run ───────────────────────────────────────────────────────────────
    case "run": await run(store.code, store.language); break;
    case "lang-js":
      if (store.language !== "js") {
        cancelAutoRun();
        store.clearOutput();
        store.setCode("");
        store.setActiveSnippetId(null);
        store.setLanguage("js");
      }
      break;
    case "lang-ts":
      if (store.language !== "ts") {
        cancelAutoRun();
        store.clearOutput();
        store.setCode("");
        store.setActiveSnippetId(null);
        store.setLanguage("ts");
      }
      break;
    case "lang-php":
      if (store.language !== "php") {
        cancelAutoRun();
        store.clearOutput();
        store.setCode("");
        store.setActiveSnippetId(null);
        store.setLanguage("php");
      }
      break;
    case "toggle-autorun":
      updateSettings({ autoRun: !store.settings.autoRun });
      break;

    // ── Help ──────────────────────────────────────────────────────────────
    case "website":      await openUrl(WEBSITE); break;
    case "github":       await openUrl(GITHUB); break;
    case "report-issue": await openUrl(ISSUES); break;
    case "releases":     await openUrl(RELEASES); break;
    case "uninstall": {
      const ok = await confirm(
        "This will permanently delete VibeForge, your snippets, settings, and the npm workspace. This cannot be undone.",
        { title: "Uninstall VibeForge?", kind: "warning" }
      );
      if (ok) await tauriClient.uninstallApp();
      break;
    }
  }
}
