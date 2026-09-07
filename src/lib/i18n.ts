import { useStore } from "../store";

export const LOCALES = [
  { id: "en", name: "English" },
  { id: "ru", name: "Русский" },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * English is the source of truth: its keys define the catalogue, and every other
 * locale is a Partial of it, so a missing translation is a type-safe fallback
 * rather than a crash.
 */
const en = {
  // Toolbar
  "toolbar.library": "Library (snippets & history)",
  "toolbar.codeLanguage": "Code language",
  "toolbar.newSnippet": "New snippet",
  "toolbar.newSnippetTitle": "Save current code as a snippet",
  "toolbar.autoRun": "auto-run",
  "toolbar.manual": "manual",
  "toolbar.linkProject": "Link project",
  "toolbar.linkProjectTitle": "Link a project folder (Node, Laravel, PHP)",
  "toolbar.unlinkProject": "Unlink project",
  "toolbar.aiChat": "Toggle AI chat",
  "toolbar.layoutBelow": "Move output below the editor",
  "toolbar.layoutSide": "Move output to the right side",
  "toolbar.packages": "Packages",
  "toolbar.settings": "Settings",
  "toolbar.run": "Run",
  "toolbar.running": "Running…",
  "toolbar.runTitle": "Run (Cmd+R or Cmd+Enter)",

  // Sidebar
  "sidebar.search": "Search…",
  "sidebar.snippets": "Snippets",
  "sidebar.history": "History",
  "sidebar.noSnippets": "No snippets yet — save one with “New snippet”.",
  "sidebar.noHistory": "No history yet — hit Run to start.",
  "sidebar.noMatches": "No matches.",
  "sidebar.snippetName": "Snippet name…",
  "sidebar.clearHistory": "Clear history",
  "sidebar.loadTitle": "Click to load",
  "sidebar.run": "Run",
  "sidebar.delete": "Delete",
  "sidebar.saveAsSnippet": "Save as snippet",
  "sidebar.cancel": "Cancel",

  // Editor
  "editor.new": "New",
  "editor.newTitle": "New scratch pad (Cmd+N)",
  "editor.copy": "Copy",
  "editor.copied": "Copied",
  "editor.copyTitle": "Copy all code",
  "editor.format": "Format",
  "editor.formatting": "Formatting…",
  "editor.formatTitle": "Format (Cmd+Shift+F)",
  "editor.clear": "Clear",
  "editor.save": "Save",
  "editor.update": "Update",
  "editor.saved": "Saved",
  "editor.saveTitle": "Save as snippet (Cmd+S)",
  "editor.updateTitle": "Update snippet (Cmd+S)",
  "editor.scrollTop": "Scroll to top",
  "editor.scrollBottom": "Scroll to bottom",

  // Console
  "console.title": "Output",
  "console.running": "Running",
  "console.copy": "Copy",
  "console.copied": "Copied",
  "console.copyTitle": "Copy all output",
  "console.find": "Find",
  "console.findPlaceholder": "Find in output",
  "console.noResults": "no results",
  "console.matches_one": "{n} match",
  "console.matches_other": "{n} matches",
  "console.clear": "Clear",
  "console.empty": "Run some code to see output here.",
  "console.noMatch": "No output matches “{q}”.",
  "console.lines_one": "{n} line",
  "console.lines_other": "{n} lines",
  "console.close": "Close",

  // AI chat
  "ai.title": "AI Chat",
  "ai.clear": "Clear",
  "ai.close": "Close",
  "ai.placeholder": "Ask AI to write or edit code…  (Enter to send)",
  "ai.send": "Send",
  "ai.insert": "Insert into editor",
  "ai.emptyConfigured": "Ask me to write or edit your code.",
  "ai.emptyUnconfigured": "Add an AI provider in Settings to get started.",
  "ai.needsKey": "Open Settings to add an AI API key.",

  // Snippet modal
  "snippet.title": "Save snippet",
  "snippet.name": "Name",
  "snippet.placeholder": "My snippet…",
  "snippet.cancel": "Cancel",
  "snippet.save": "Save snippet",
  "snippet.saving": "Saving…",

  // Packages
  "pkg.title": "npm packages",
  "pkg.search": "Search npm (e.g. lodash, axios, dayjs)",
  "pkg.searching": "searching…",
  "pkg.install": "Install",
  "pkg.installing": "Installing {name}…",
  "pkg.installed": "Installed {name}",
  "pkg.removing": "Removing {name}…",
  "pkg.removed": "Removed {name}",
  "pkg.error": "Error: {msg}",
  "pkg.remove": "Remove",
  "pkg.empty": "No packages installed yet.",

  // Settings
  "settings.title": "Settings",
  "settings.cancel": "Cancel",
  "settings.save": "Save changes",
  "settings.saving": "Saving…",
  "settings.close": "Close",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeGlass": "Glass",
  "settings.themeDark": "Dark",
  "settings.themeLight": "Light",
  "settings.language": "Language",
  "settings.languageHint": "Menu bar stays in English",
  "settings.fontSize": "Font size",
  "settings.fontSizeHint": "Shared by the editor and output",
  "settings.execution": "Execution",
  "settings.autoRun": "Auto-run on type",
  "settings.autoRunDelay": "Auto-run delay",
  "settings.autoRunDelayHint": "Milliseconds of idle typing before a run",
  "settings.historyLimit": "History limit",
  "settings.runs": "{n} runs",
  "settings.runtimes": "Runtimes",
  "settings.nodePath": "Node.js path",
  "settings.phpPath": "PHP path",
  "settings.autoDetect": "Leave empty to auto-detect",
  "settings.ai": "AI assistant",
  "settings.provider": "Provider",
  "settings.providerNone": "None",
  "settings.apiKey": "API key",
  "settings.model": "Model",
} as const;

export type TranslationKey = keyof typeof en;

const ru: Partial<Record<TranslationKey, string>> = {
  "toolbar.library": "Библиотека (сниппеты и история)",
  "toolbar.codeLanguage": "Язык кода",
  "toolbar.newSnippet": "Новый сниппет",
  "toolbar.newSnippetTitle": "Сохранить текущий код как сниппет",
  "toolbar.autoRun": "автозапуск",
  "toolbar.manual": "вручную",
  "toolbar.linkProject": "Привязать проект",
  "toolbar.linkProjectTitle": "Привязать папку проекта (Node, Laravel, PHP)",
  "toolbar.unlinkProject": "Отвязать проект",
  "toolbar.aiChat": "AI-чат",
  "toolbar.layoutBelow": "Вывод под редактором",
  "toolbar.layoutSide": "Вывод справа",
  "toolbar.packages": "Пакеты",
  "toolbar.settings": "Настройки",
  "toolbar.run": "Запуск",
  "toolbar.running": "Выполняется…",
  "toolbar.runTitle": "Запустить (Cmd+R или Cmd+Enter)",

  "sidebar.search": "Поиск…",
  "sidebar.snippets": "Сниппеты",
  "sidebar.history": "История",
  "sidebar.noSnippets": "Сниппетов пока нет — сохраните через «Новый сниппет».",
  "sidebar.noHistory": "История пуста — нажмите «Запуск».",
  "sidebar.noMatches": "Ничего не найдено.",
  "sidebar.snippetName": "Название сниппета…",
  "sidebar.clearHistory": "Очистить историю",
  "sidebar.loadTitle": "Нажмите, чтобы загрузить",
  "sidebar.run": "Запустить",
  "sidebar.delete": "Удалить",
  "sidebar.saveAsSnippet": "Сохранить как сниппет",
  "sidebar.cancel": "Отмена",

  "editor.new": "Новый",
  "editor.newTitle": "Новый черновик (Cmd+N)",
  "editor.copy": "Копировать",
  "editor.copied": "Скопировано",
  "editor.copyTitle": "Скопировать весь код",
  "editor.format": "Форматировать",
  "editor.formatting": "Форматирую…",
  "editor.formatTitle": "Форматировать (Cmd+Shift+F)",
  "editor.clear": "Очистить",
  "editor.save": "Сохранить",
  "editor.update": "Обновить",
  "editor.saved": "Сохранено",
  "editor.saveTitle": "Сохранить как сниппет (Cmd+S)",
  "editor.updateTitle": "Обновить сниппет (Cmd+S)",
  "editor.scrollTop": "Наверх",
  "editor.scrollBottom": "Вниз",

  "console.title": "Вывод",
  "console.running": "Выполняется",
  "console.copy": "Копировать",
  "console.copied": "Скопировано",
  "console.copyTitle": "Скопировать весь вывод",
  "console.find": "Найти",
  "console.findPlaceholder": "Поиск в выводе",
  "console.noResults": "нет совпадений",
  "console.matches_one": "{n} совпадение",
  "console.matches_other": "{n} совпадений",
  "console.clear": "Очистить",
  "console.empty": "Запустите код, чтобы увидеть вывод.",
  "console.noMatch": "Нет совпадений с «{q}».",
  "console.lines_one": "{n} строка",
  "console.lines_other": "{n} строк",
  "console.close": "Закрыть",

  "ai.title": "AI-чат",
  "ai.clear": "Очистить",
  "ai.close": "Закрыть",
  "ai.placeholder": "Попросите AI написать или поправить код…  (Enter — отправить)",
  "ai.send": "Отправить",
  "ai.insert": "Вставить в редактор",
  "ai.emptyConfigured": "Попросите написать или поправить код.",
  "ai.emptyUnconfigured": "Добавьте AI-провайдера в настройках.",
  "ai.needsKey": "Откройте настройки и добавьте API-ключ.",

  "snippet.title": "Сохранить сниппет",
  "snippet.name": "Название",
  "snippet.placeholder": "Мой сниппет…",
  "snippet.cancel": "Отмена",
  "snippet.save": "Сохранить",
  "snippet.saving": "Сохраняю…",

  "pkg.title": "npm-пакеты",
  "pkg.search": "Поиск в npm (например lodash, axios, dayjs)",
  "pkg.searching": "ищу…",
  "pkg.install": "Установить",
  "pkg.installing": "Устанавливаю {name}…",
  "pkg.installed": "Установлен {name}",
  "pkg.removing": "Удаляю {name}…",
  "pkg.removed": "Удалён {name}",
  "pkg.error": "Ошибка: {msg}",
  "pkg.remove": "Удалить",
  "pkg.empty": "Пакеты не установлены.",

  "settings.title": "Настройки",
  "settings.cancel": "Отмена",
  "settings.save": "Сохранить",
  "settings.saving": "Сохраняю…",
  "settings.close": "Закрыть",
  "settings.appearance": "Внешний вид",
  "settings.theme": "Тема",
  "settings.themeGlass": "Стекло",
  "settings.themeDark": "Тёмные",
  "settings.themeLight": "Светлые",
  "settings.language": "Язык",
  "settings.languageHint": "Меню macOS остаётся на английском",
  "settings.fontSize": "Размер шрифта",
  "settings.fontSizeHint": "Общий для редактора и вывода",
  "settings.execution": "Выполнение",
  "settings.autoRun": "Автозапуск при вводе",
  "settings.autoRunDelay": "Задержка автозапуска",
  "settings.autoRunDelayHint": "Миллисекунд простоя перед запуском",
  "settings.historyLimit": "Размер истории",
  "settings.runs": "{n} запусков",
  "settings.runtimes": "Среды выполнения",
  "settings.nodePath": "Путь к Node.js",
  "settings.phpPath": "Путь к PHP",
  "settings.autoDetect": "Пусто — определить автоматически",
  "settings.ai": "AI-ассистент",
  "settings.provider": "Провайдер",
  "settings.providerNone": "Нет",
  "settings.apiKey": "API-ключ",
  "settings.model": "Модель",
};

const CATALOGUES: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, ru };

export function resolveLocale(stored: string | null | undefined): Locale {
  return LOCALES.some((l) => l.id === stored) ? (stored as Locale) : DEFAULT_LOCALE;
}

/** Russian needs 3 plural forms; English 2. Keys carry `_one` / `_other`. */
function pluralSuffix(locale: Locale, n: number): "_one" | "_other" {
  if (locale === "ru") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    return mod10 === 1 && mod100 !== 11 ? "_one" : "_other";
  }
  return n === 1 ? "_one" : "_other";
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const raw = CATALOGUES[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => String(vars[name] ?? m));
}

export interface Translator {
  (key: TranslationKey, vars?: Record<string, string | number>): string;
  /** Picks the `_one` / `_other` variant of `base` for `n`, and injects it as {n}. */
  plural: (base: string, n: number, vars?: Record<string, string | number>) => string;
  locale: Locale;
}

export function useT(): Translator {
  const locale = resolveLocale(useStore((s) => s.settings.locale));

  const t = ((key, vars) => translate(locale, key, vars)) as Translator;
  t.locale = locale;
  t.plural = (base, n, vars) =>
    translate(locale, (base + pluralSuffix(locale, n)) as TranslationKey, { n, ...vars });
  return t;
}
