import { create } from "zustand";
import type { AiMessage, ExecutionLine, HistoryEntry, Language, Package, ProjectContext, Settings, Snippet } from "../types";

const DEFAULT_CODE = '// Welcome to VibeForge\nconsole.log("Hello, World!");\n';

const DEFAULT_SETTINGS: Settings = {
  locale: "en",
  theme: "glass-dark",
  fontSize: 14,
  autoRun: true,
  autoRunDelay: 500,
  envVars: {},
  nodePath: null,
  phpPath: null,
  historyLimit: 100,
  projectPath: null,
  projectType: null,
  aiProvider: null,
  aiApiKey: null,
  aiModel: null,
};

interface AppState {
  code: string;
  language: Language;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;

  isRunning: boolean;
  outputLines: ExecutionLine[];
  setIsRunning: (v: boolean) => void;
  appendOutput: (line: ExecutionLine) => void;
  clearOutput: () => void;

  snippets: Snippet[];
  setSnippets: (s: Snippet[]) => void;
  upsertSnippet: (s: Snippet) => void;
  removeSnippet: (id: string) => void;
  activeSnippetId: string | null;
  setActiveSnippetId: (id: string | null) => void;

  packages: Package[];
  setPackages: (p: Package[]) => void;

  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  prependHistory: (entry: HistoryEntry) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  settings: Settings;
  setSettings: (s: Settings) => void;

  project: ProjectContext | null;
  setProject: (p: ProjectContext | null) => void;

  aiChatOpen: boolean;
  aiMessages: AiMessage[];
  aiStreaming: boolean;
  toggleAiChat: () => void;
  setAiMessages: (msgs: AiMessage[]) => void;
  appendAiMessage: (msg: AiMessage) => void;
  appendAiToken: (id: string, token: string) => void;
  setAiStreaming: (v: boolean) => void;

  sidebarOpen: boolean;
  packagesOpen: boolean;
  settingsOpen: boolean;
  snippetModalOpen: boolean;
  consoleLayout: "side" | "below";
  toggleSidebar: () => void;
  togglePackages: () => void;
  toggleSettings: () => void;
  toggleSnippetModal: () => void;
  toggleConsoleLayout: () => void;
}

export const useStore = create<AppState>((set) => ({
  code: DEFAULT_CODE,
  language: "js",
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),

  isRunning: false,
  outputLines: [],
  setIsRunning: (isRunning) => set({ isRunning }),
  appendOutput: (line) => set((s) => ({ outputLines: [...s.outputLines, line] })),
  clearOutput: () => set({ outputLines: [] }),

  snippets: [],
  setSnippets: (snippets) => set({ snippets }),
  upsertSnippet: (snippet) =>
    set((s) => ({
      snippets: s.snippets.some((x) => x.id === snippet.id)
        ? s.snippets.map((x) => (x.id === snippet.id ? snippet : x))
        : [snippet, ...s.snippets],
    })),
  removeSnippet: (id) =>
    set((s) => ({ snippets: s.snippets.filter((x) => x.id !== id) })),
  activeSnippetId: null,
  setActiveSnippetId: (activeSnippetId) => set({ activeSnippetId }),

  packages: [],
  setPackages: (packages) => set({ packages }),

  history: [],
  setHistory: (history) => set({ history }),
  prependHistory: (entry) => set((s) => ({ history: [entry, ...s.history] })),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),

  project: null,
  setProject: (project) => set({ project }),

  aiChatOpen: false,
  aiMessages: [],
  aiStreaming: false,
  toggleAiChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
  setAiMessages: (aiMessages) => set({ aiMessages }),
  appendAiMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),
  appendAiToken: (id, token) =>
    set((s) => ({
      aiMessages: s.aiMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),
  setAiStreaming: (aiStreaming) => set({ aiStreaming }),

  sidebarOpen: true,
  packagesOpen: false,
  settingsOpen: false,
  snippetModalOpen: false,
  consoleLayout: "side",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  togglePackages: () => set((s) => ({ packagesOpen: !s.packagesOpen })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  toggleSnippetModal: () => set((s) => ({ snippetModalOpen: !s.snippetModalOpen })),
  toggleConsoleLayout: () =>
    set((s) => ({ consoleLayout: s.consoleLayout === "side" ? "below" : "side" })),
}));
