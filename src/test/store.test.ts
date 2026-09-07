import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";
import type { ExecutionLine, Snippet } from "../types";

beforeEach(() => {
  useStore.setState({
    code: '// Welcome to VibeForge\nconsole.log("Hello, World!");\n',
    language: "js",
    isRunning: false,
    outputLines: [],
    snippets: [],
    packages: [],
    sidebarOpen: true,
    packagesOpen: false,
    settingsOpen: false,
    previewOpen: false,
  });
});

describe("useStore — editor state", () => {
  it("updates code", () => {
    useStore.getState().setCode("console.log(42)");
    expect(useStore.getState().code).toBe("console.log(42)");
  });

  it("switches language", () => {
    useStore.getState().setLanguage("ts");
    expect(useStore.getState().language).toBe("ts");
  });
});

describe("useStore — output lines", () => {
  it("appends output immutably", () => {
    const line: ExecutionLine = { output_type: "stdout", content: "hello", timestamp: 1 };
    const before = useStore.getState().outputLines;
    useStore.getState().appendOutput(line);
    const after = useStore.getState().outputLines;
    expect(after).not.toBe(before);
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(line);
  });

  it("appends multiple lines in order", () => {
    const a: ExecutionLine = { output_type: "stdout", content: "a", timestamp: 1 };
    const b: ExecutionLine = { output_type: "stderr", content: "b", timestamp: 2 };
    useStore.getState().appendOutput(a);
    useStore.getState().appendOutput(b);
    const lines = useStore.getState().outputLines;
    expect(lines).toHaveLength(2);
    expect(lines[0].content).toBe("a");
    expect(lines[1].content).toBe("b");
  });

  it("clears output", () => {
    useStore.getState().appendOutput({ output_type: "stdout", content: "x", timestamp: 1 });
    useStore.getState().clearOutput();
    expect(useStore.getState().outputLines).toHaveLength(0);
  });
});

describe("useStore — snippets", () => {
  const snippet: Snippet = {
    id: "abc",
    name: "Test",
    code: "1+1",
    language: "js",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  it("sets snippets", () => {
    useStore.getState().setSnippets([snippet]);
    expect(useStore.getState().snippets).toHaveLength(1);
  });

  it("inserts new snippet via upsert", () => {
    useStore.getState().upsertSnippet(snippet);
    expect(useStore.getState().snippets).toHaveLength(1);
    expect(useStore.getState().snippets[0].id).toBe("abc");
  });

  it("updates existing snippet via upsert without duplicating", () => {
    useStore.getState().upsertSnippet(snippet);
    useStore.getState().upsertSnippet({ ...snippet, name: "Updated" });
    const snippets = useStore.getState().snippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0].name).toBe("Updated");
  });

  it("removes snippet by id", () => {
    useStore.getState().setSnippets([snippet]);
    useStore.getState().removeSnippet("abc");
    expect(useStore.getState().snippets).toHaveLength(0);
  });

  it("does not mutate original array on remove", () => {
    useStore.getState().setSnippets([snippet]);
    const before = useStore.getState().snippets;
    useStore.getState().removeSnippet("abc");
    expect(useStore.getState().snippets).not.toBe(before);
  });
});

describe("useStore — UI toggles", () => {
  it("toggles sidebar", () => {
    expect(useStore.getState().sidebarOpen).toBe(true);
    useStore.getState().toggleSidebar();
    expect(useStore.getState().sidebarOpen).toBe(false);
    useStore.getState().toggleSidebar();
    expect(useStore.getState().sidebarOpen).toBe(true);
  });

  it("toggles packages panel", () => {
    expect(useStore.getState().packagesOpen).toBe(false);
    useStore.getState().togglePackages();
    expect(useStore.getState().packagesOpen).toBe(true);
  });
});
