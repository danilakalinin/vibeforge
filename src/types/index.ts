export interface ExecutionLine {
  output_type: "stdout" | "stderr" | "info" | "separator";
  content: string;
  timestamp: number;
}

export interface ExecutionDone {
  exit_code: number | null;
}

export interface Snippet {
  id: string;
  name: string;
  code: string;
  language: "js" | "ts" | "php";
  createdAt: string;
  updatedAt: string;
  projectPath?: string | null;
  projectType?: string | null;
}

export interface Package {
  name: string;
  version: string;
}

export type Language = "js" | "ts" | "php";

export interface HistoryEntry {
  id: string;
  code: string;
  language: Language;
  ranAt: string;
  projectPath?: string | null;
  projectType?: string | null;
}

export interface Settings {
  /** Locale id from src/lib/i18n.ts ("en", "ru"). */
  locale: string;
  /** Theme id from src/lib/themes.ts. Legacy values "dark"/"light" still resolve. */
  theme: string;
  fontSize: number;
  autoRun: boolean;
  autoRunDelay: number;
  envVars: Record<string, string>;
  nodePath: string | null;
  phpPath: string | null;
  historyLimit: number;
  projectPath: string | null;
  projectType: string | null;
  aiProvider: AiProvider | null;
  aiApiKey: string | null;
  aiModel: string | null;
}

export type ProjectType = "node" | "laravel" | "php" | "unknown";

export interface ProjectContext {
  path: string;
  type: ProjectType;
}

export type AiProvider = "claude" | "openai" | "openrouter" | "groq" | "deepseek";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
