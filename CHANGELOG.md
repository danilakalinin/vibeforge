# Changelog

## [Unreleased]

### Added
- **DeepSeek AI provider** — Select "DeepSeek" in Settings → AI Assistant and paste a DeepSeek API key to chat with `deepseek-chat`. Uses DeepSeek's native OpenAI-compatible endpoint directly (no OpenRouter markup).
- **Glass themes** — Glass Dark (new default) and Glass Light use the native macOS window vibrancy: translucent frosted panels with the desktop blurred behind them. Switching to a solid theme clears the vibrancy automatically.
- **Editor themes** — Settings → Theme also offers a full set of named solid themes (Dracula, Nord, Night Owl, Monokai, Tomorrow Night, GitHub Dark/Light, Solarized Dark/Light, Oceanic Next, Cobalt2). Each theme restyles the entire app — editor, panels, toolbar, sidebar — not just the code pane.
- **Interface languages** — English and Russian, switchable in Settings → Appearance and applied instantly. The macOS menu bar stays in English for now.

### Changed
- **Themes apply the moment you pick them** — chrome, native vibrancy and the editor all repaint live; Cancel rolls the preview back. The same goes for the interface language.
- **Redesigned UI** — a small GitHub-flavoured component layer (buttons, inputs, segmented control, dialogs) replaces the ad-hoc styling: 1px borders instead of shadows, 6px radii, medium label weight, and a single visible focus ring. Tighter toolbar with a proper segmented language switcher and Run promoted to the primary action.
- **Accent colour is now blue** instead of amber, across the app, the Monaco glass themes, and the landing page.
- **New app icon**, with a light and a dark variant. The toolbar shows the VibeForge wordmark on its own, without an icon.
- **Renamed VibeLab → VibeForge**. New bundle identifier `dev.vibeforge.app` and data directory `~/.vibeforge`; a previous VibeLab install is treated as a separate app (its snippets and settings are not carried over).
- The theme setting stores a theme id instead of `"dark"` / `"light"`; existing settings (including the old `vibelab-*` / `vibeforge-*` ids) are migrated to the Glass themes automatically on load.
- macOS builds now use the `macos-private-api` feature for the transparent/vibrant window, so VibeForge can no longer be submitted to the Mac App Store (it is already distributed as an unsigned `.dmg`).

### Fixed
- **Glass themes are actually translucent again.** The page painted a tint on `<body>` *and* on each panel, and a `backdrop-filter` on `<body>` made WebKit composite the window opaquely — together they flattened the vibrancy. The window is now fully transparent and each panel contributes exactly one tint; `backdrop-filter` is reserved for dialogs and popovers, which do have app content behind them to frost.
- Restored the missing `cargo test` build: the snippet test helper had not been updated when project memory added fields in 0.2.0.
- OpenRouter-only attribution headers (`HTTP-Referer`, `X-Title`) are no longer sent to other OpenAI-compatible providers.
- Changing the theme now restyles the Monaco editor live instead of only on the next launch.

## [0.2.0] - 2026-05-25

### Added
- **Output folding** — Console output is now grouped by run. Old runs collapse automatically when a new run starts; click ▶/▼ to expand or collapse any group.
- **Scroll arrows** — ↑ and ↓ navigation buttons appear on both the editor and output panel when you've scrolled away from the top or bottom.
- **Smart auto-scroll** — Output only follows new content if you're already at the bottom. Scrolling up to read stops the auto-follow; the ↓ button returns you.
- **Project memory** — Snippets and history entries now remember which project they were linked to. Loading a snippet or history entry automatically restores the project link.
- **Console output coloring** — stdout is colorized: strings in green, numbers in blue, booleans/null in red, with full ANSI escape code support.
- **Save / Cmd+S** — When no snippet is active, Cmd+S opens the Save as Snippet modal. When a snippet is loaded, Cmd+S updates it in place with a "Saved ✓" confirmation.
- **New / Cmd+N** — New button (toolbar + File menu) clears the editor and deactivates any active snippet.

### Fixed
- **PHP syntax highlighting** — Monaco editor now correctly colorizes PHP code written without a `<?php` opening tag.
- **Font size sync** — Editor and console output share the same font size setting; changing one changes both.

## [0.1.0] - 2026-05-24

### Added
- **Native macOS menu bar** — Full File / Edit / View / Run / Window / Help menu wired to all app actions with keyboard shortcuts.
- **In-app self-uninstall** — Help → Uninstall VibeForge… removes the app and all its data (snippets, settings, npm workspace, caches) without touching the Terminal.
- Initial release: JavaScript / TypeScript / PHP scratchpad with live streaming output, AI chat panel, npm package manager, project linking, and snippet library.
