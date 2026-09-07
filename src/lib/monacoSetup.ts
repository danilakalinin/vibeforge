// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
// @ts-expect-error — php.js has no .d.ts in monaco-editor's sub-paths
import * as phpLang from "monaco-editor/esm/vs/basic-languages/php/php.js";

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

loader.config({ monaco });

// Monaco's built-in PHP grammar wraps PHP in an HTML context: its root state
// only activates PHP highlighting after it sees "<?php". VibeForge writes PHP
// without that tag (script-only mode), so nothing ever gets colored.
// Fix: override the root state to fall through directly to phpRoot, while
// still supporting <?php for files that do include the opening tag.
monaco.languages.setMonarchTokensProvider("php", {
  ...phpLang.language,
  tokenizer: {
    ...phpLang.language.tokenizer,
    root: [
      [/<\?((php)|=)?/, { token: "@rematch", switchTo: "@phpInSimpleState.root" }],
      { include: "phpRoot" },
    ],
  },
});
monaco.languages.setLanguageConfiguration("php", phpLang.conf);
