# VibeForge

> A local JavaScript / TypeScript / PHP scratchpad with a built-in AI assistant — no browser, no cloud, runs entirely on your machine.

**[danilakalinin.github.io/vibeforge](https://danilakalinin.github.io/vibeforge/)** · [Releases](https://github.com/danilakalinin/vibeforge/releases) · [Русская версия](README.md)

---

## What it is

VibeForge is a desktop scratchpad for the kind of code you write to answer a question, not to ship: *does this regex actually match?*, *what does this API return?*, *how do I reshape this array?*

You get a real editor (Monaco — the one inside VS Code), a Run button, and streaming output. Nothing is uploaded anywhere: your code runs through the Node.js and PHP already installed on your machine, and snippets live in a local SQLite file.

It is built with Tauri v2, so the whole thing is a small native app rather than a bundled browser.

## Who it's for

- **You keep a "scratch.js" file around** and run it with `node scratch.js` in a terminal loop. This replaces that loop with one window.
- **You write PHP or Laravel** and want a `tinker`-like pad with autocomplete for your project's own classes — link a project folder and VibeForge reads its `composer.json` and class map.
- **You want an AI assistant that already sees your code.** No copy-pasting into a chat tab: the assistant gets your editor contents and your project's installed packages automatically.
- **You dislike leaving code in web tools.** Everything is local; API keys, if you add any, stay in `~/.vibeforge/settings.json`.

If you need a debugger, a file tree, or a build pipeline, use a real IDE — that is deliberately not what this is.

---

## Fork notice

VibeForge is a fork of **[VibeLab](https://github.com/CybertronianKelvin/vibelab)** by Cybertronian, MIT-licensed. All credit for the original application — the executor, the AI chat panel, the npm manager, the project linking and the snippet library — belongs there.

This fork continues from VibeLab 0.2.0 and reworks the interface, adds a theming system, adds a provider, and adds localisation. What follows is the complete list.

## What this fork adds

### Glass themes with real macOS vibrancy

The window is genuinely transparent, and macOS blurs your desktop behind it through an `NSVisualEffectView` — this is the system material, not a CSS blur imitating one. **Glass Dark** is the new default; **Glass Light** is there for bright rooms. Picking any solid theme clears the vibrancy automatically.

Getting this right meant two non-obvious constraints, both documented in `src/index.css`:

- **Exactly one translucent layer.** Tinting both `<body>` and each panel composites to roughly 60% opacity and the frost turns to mud. The window chrome is now fully transparent and each panel contributes a single tint.
- **No `backdrop-filter` on a full-window surface.** Inside a transparent window there is no web content behind the page for WebKit to sample, so it composites the region opaquely — which *kills* the vibrancy instead of blurring it. `backdrop-filter` is reserved for dialogs and popovers, which do have app content behind them.

This requires Tauri's `macos-private-api` feature, so a build of this fork cannot be submitted to the Mac App Store. Since the app is distributed as an unsigned `.dmg` anyway, that costs nothing in practice.

### Eleven more editor themes

Dracula, Nord, Night Owl, Monokai, Tomorrow Night, GitHub Dark, GitHub Light, Solarized Dark, Solarized Light, Oceanic Next and Cobalt2.

Upstream had a dark/light toggle that only recoloured the code pane — most of the interface was hardcoded dark regardless. Here the whole palette (`surface-*`, `brand-*`, and the text ramp) runs through CSS custom properties, so a theme repaints the editor, toolbar, sidebar, output panel and dialogs together. Theme definitions are vendored under `src/themes/`; adding one is a JSON file plus two short entries.

### Themes and language apply the moment you pick them

No Save, no restart. Selecting a theme repaints the interface, swaps the native window material and re-themes Monaco in one go; Cancel rolls the preview back to what you had.

### DeepSeek as a first-class AI provider

Previously the only way to use a DeepSeek key was to route it through OpenRouter — extra hop, extra markup — or to paste it into the OpenAI slot, where it simply failed against `api.openai.com`. DeepSeek now talks to its own OpenAI-compatible endpoint directly.

Selecting any provider also fills in a sensible default model, so a fresh setup no longer looks configured while silently missing the model field.

### English and Russian interface

Switchable in **Settings → Appearance**, applied instantly. Translations are a small hand-rolled catalogue with no runtime dependency; English defines the key set, so a missing translation falls back to English at the type level rather than crashing. Russian plural rules are handled properly (*1 строка* / *5 строк*).

The macOS menu bar is still English — it is built before settings load.

### Redesigned interface

Rebuilt around a small component layer modelled on GitHub's Primer: 1px borders instead of drop shadows, 6px radii, medium rather than bold label weight, and one consistent focus ring. Buttons now have an actual hierarchy — primary, default, invisible, danger — rather than each call site inventing its own Tailwind string.

Concretely: the toolbar is tighter and Run is the primary action; the code-language switcher is a proper segmented control instead of three accent-filled buttons; Settings is grouped into Appearance / Execution / Runtimes / AI assistant; dialogs share a single frame; the resize handle is a 1px seam with a wide grab area.

The accent colour changed from amber to blue, and the app has a new icon.

### Renamed, with a separate identity

VibeLab → VibeForge throughout: bundle identifier `dev.vibeforge.app`, data directory `~/.vibeforge`. An existing VibeLab install is a **separate application** — its snippets and settings are not migrated, and it is not replaced. Uninstall it separately if you no longer want it.

### Fixes

- OpenRouter-only attribution headers (`HTTP-Referer`, `X-Title`) were being sent to every OpenAI-compatible provider. Now scoped to OpenRouter.
- Changing the theme only reached Monaco on the next launch.
- `cargo test` did not compile: a snippet test helper was never updated when project memory added two fields in 0.2.0.

---

## Features

- **Monaco editor** — the editor from VS Code, with highlighting for JavaScript, TypeScript, PHP and more
- **Live execution** — run JS/TS directly, with stdout/stderr streaming into the output panel
- **AI chat panel** — Claude, OpenAI, Groq, DeepSeek and OpenRouter; the assistant sees your editor contents and your project's installed packages
- **npm package manager** — search, install and remove packages without leaving the app
- **Project linking** — point at a local folder and the assistant reads its `package.json` or `composer.json`; Laravel projects also get facade, helper and project-class completion
- **Themeable** — 13 themes, including two that use the native macOS window material
- **Bilingual** — English and Russian
- **Find in output** — Cmd/Ctrl+F search in the console panel, with per-run folding
- **Snippet library** — a local SQLite store, plus run history that remembers which project it belonged to

---

## Install

**macOS only for now.** Windows and Linux installers will be added when available.

1. Download the `.dmg` for your chip from the [Releases page](https://github.com/danilakalinin/vibeforge/releases/latest) — `arm64` for Apple Silicon, `x64` for Intel
2. Open it and drag **VibeForge** to `/Applications`
3. The app is unsigned, so Gatekeeper blocks it on first launch. Run this once:

```bash
xattr -cr /Applications/VibeForge.app
```

Then open it normally.

## Uninstall

**Help → Uninstall VibeForge…** from the menu bar. Confirm, and the app closes and removes all of its data — snippets database, settings, npm workspace and caches. No Terminal required.

---

## Development

Requirements: [Rust](https://rustup.rs), [Node.js 18+](https://nodejs.org), and the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/).

```bash
git clone git@github.com:danilakalinin/vibeforge.git
cd vibeforge
npm install
npm run tauri dev
```

Run the tests:

```bash
npm test && (cd src-tauri && cargo test)
```

Build a release locally:

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

### Adding a theme

1. Drop a [monaco-themes](https://github.com/brijeshb42/monaco-themes)-format JSON into `src/themes/`
2. Add a row to `THEMES` in `src/lib/themes.ts`
3. Add a `:root[data-theme="your-id"]` block to `src/index.css` with the palette

### Adding a language

1. Add an entry to `LOCALES` in `src/lib/i18n.ts`
2. Add a catalogue to `CATALOGUES` — it is a `Partial` of the English keys, so you can translate incrementally

---

## Licence

MIT — see [LICENSE](LICENSE). Original work © 2026 Cybertronian; fork changes © 2026 Danila Kalinin.
