import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store";
import { useT } from "../../lib/i18n";
import { IconArrowDown, IconArrowUp, IconSearch, IconX } from "../icons";
import type { ExecutionLine } from "../../types";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const re = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-400/40 text-yellow-100 rounded-sm not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ── Output colorizer ─────────────────────────────────────────────────────────

const ANSI_FG: Record<number, string> = {
  30: "#6b7280", 31: "#f87171", 32: "#4ade80", 33: "#fbbf24",
  34: "#60a5fa", 35: "#c084fc", 36: "#34d399", 37: "#d1d5db",
  90: "#9ca3af", 91: "#fca5a5", 92: "#86efac", 93: "#fde68a",
  94: "#93c5fd", 95: "#d8b4fe", 96: "#6ee7b7", 97: "#f9fafb",
};

interface Segment { text: string; color?: string; bold?: boolean }

function parseAnsi(text: string): Segment[] {
  const segments: Segment[] = [];
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let color: string | undefined;
  let bold = false;
  for (const part of parts) {
    if (part.startsWith("\x1b[")) {
      const codes = part.slice(2, -1).split(";").map(Number);
      for (const c of codes) {
        if (c === 0) { color = undefined; bold = false; }
        else if (c === 1) bold = true;
        else if (ANSI_FG[c]) color = ANSI_FG[c];
      }
    } else if (part) {
      segments.push({ text: part, color, bold });
    }
  }
  return segments;
}

function tokenizeOutput(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:true|false|TRUE|FALSE)\b|\b(?:null|NULL|undefined|NaN|Infinity)\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    const v = m[1];
    let color = "#60a5fa";
    if (v[0] === '"' || v[0] === "'") color = "#86efac";
    else if (/^(?:true|TRUE)$/.test(v)) color = "#4ade80";
    else if (/^(?:false|FALSE|null|NULL|undefined|NaN)$/.test(v)) color = "#f87171";
    segments.push({ text: v, color });
    last = m.index + v.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

function renderSegments(segments: Segment[], query: string): React.ReactNode {
  return segments.map((seg, i) => (
    <span key={i} style={{ color: seg.color, fontWeight: seg.bold ? "bold" : undefined }}>
      {highlightText(seg.text, query)}
    </span>
  ));
}

function Line({ line, searchQuery, fontSize }: { line: ExecutionLine; searchQuery: string; fontSize: number }) {
  const wrapperColors = { stdout: "text-gray-200", stderr: "text-red-400", info: "text-brand-300", separator: "" };
  const prefix = { stdout: "", stderr: "✖ ", info: "ℹ ", separator: "" };

  let content: React.ReactNode;
  if (line.output_type === "stdout") {
    const hasAnsi = /\x1b\[/.test(line.content);
    const segments = hasAnsi ? parseAnsi(line.content) : tokenizeOutput(line.content);
    content = renderSegments(segments, searchQuery);
  } else {
    content = highlightText(line.content, searchQuery);
  }

  return (
    <div
      className={`font-mono leading-relaxed px-4 py-0.5 whitespace-pre-wrap break-words ${wrapperColors[line.output_type]}`}
      style={{ fontSize }}
    >
      <span className="opacity-40" style={{ fontSize: fontSize - 2 }}>{prefix[line.output_type]}</span>
      {content}
    </div>
  );
}

// ── Run grouping ──────────────────────────────────────────────────────────────

interface Run {
  separator: ExecutionLine;
  lines: ExecutionLine[];
}

function groupIntoRuns(outputLines: ExecutionLine[]): Run[] {
  const runs: Run[] = [];
  for (const line of outputLines) {
    if (line.output_type === "separator") {
      runs.push({ separator: line, lines: [] });
    } else if (runs.length > 0) {
      runs[runs.length - 1].lines.push(line);
    }
  }
  return runs;
}

const LANG_LABEL: Record<string, string> = { js: "JS", ts: "TS", php: "PHP" };

function RunHeader({
  run, idx, collapsed, onToggle, isActive,
}: {
  run: Run; idx: number; collapsed: boolean; onToggle: (idx: number) => void; isActive: boolean;
}) {
  const t = useT();
  const lang = LANG_LABEL[run.separator.content] ?? run.separator.content.toUpperCase();
  const time = new Date(run.separator.timestamp).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const count = run.lines.length;

  return (
    <button
      onClick={() => onToggle(idx)}
      className="w-full flex items-center gap-2 px-3 h-7 text-xs hover:bg-surface-700 border-b border-surface-700 transition-colors group"
    >
      <span className="text-gray-600 group-hover:text-gray-400 w-3 text-center shrink-0 text-[9px]">
        {collapsed ? "▶" : "▼"}
      </span>
      <span className={`font-mono font-semibold ${isActive ? "text-brand-300" : "text-gray-500"}`}>{lang}</span>
      <span className="text-gray-600 tabular-nums">{time}</span>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
      <span className="ml-auto text-gray-600 tabular-nums">{t.plural("console.lines", count)}</span>
    </button>
  );
}

// ── Console ───────────────────────────────────────────────────────────────────

export function Console() {
  const { outputLines, isRunning, clearOutput, settings } = useStore();
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedRuns, setCollapsedRuns] = useState<Set<number>>(new Set());
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
  const atBottomRef = useRef(true);
  const prevRunCount = useRef(0);

  const runs = useMemo(() => groupIntoRuns(outputLines), [outputLines]);

  // Auto-collapse all previous runs when a new run starts
  useEffect(() => {
    const count = runs.length;
    if (count > prevRunCount.current && count > 1) {
      setCollapsedRuns(new Set(Array.from({ length: count - 1 }, (_, i) => i)));
    }
    prevRunCount.current = count;
  }, [runs.length]);


  // Reset when output is fully cleared
  useEffect(() => {
    if (outputLines.length === 0) {
      setCollapsedRuns(new Set());
      prevRunCount.current = 0;
      atBottomRef.current = true;
      setShowScrollBtn(false);
    }
  }, [outputLines.length]);

  const toggleRun = (idx: number) => {
    setCollapsedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allContentLines = useMemo(
    () => outputLines.filter((l) => l.output_type !== "separator"),
    [outputLines]
  );

  const handleCopy = async () => {
    if (!allContentLines.length) return;
    const text = allContentLines.map((l) => l.content).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Follow-mode: scroll with new output only if already at bottom
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [outputLines]);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    atBottomRef.current = bottom;
    setShowScrollBtn(!bottom);
    setShowScrollTopBtn(el.scrollTop > 50);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    atBottomRef.current = true;
    setShowScrollBtn(false);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowScrollTopBtn(false);
  };

  useEffect(() => {
    if (showSearch) {
      searchRef.current?.focus();
      searchRef.current?.select();
    } else {
      setSearch("");
    }
  }, [showSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "f") return;
      if (document.querySelector(".monaco-editor.focused")) return;
      e.preventDefault();
      setShowSearch((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowSearch((v) => !v);
    window.addEventListener("vibeforge:find-console", handler);
    return () => window.removeEventListener("vibeforge:find-console", handler);
  }, []);

  const matchCount = search.trim()
    ? allContentLines.reduce(
        (n, l) => n + (l.content.toLowerCase().split(search.toLowerCase()).length - 1),
        0
      )
    : 0;

  const filteredLines = search.trim()
    ? allContentLines.filter((l) => l.content.toLowerCase().includes(search.toLowerCase()))
    : [];

  const isEmpty = runs.length === 0;

  return (
    <div className="relative flex flex-col h-full bg-surface-900">
      {/* Floating find bar */}
      {showSearch && (
        <div className="popover absolute top-11 right-3 z-20 flex items-center gap-2 pl-2.5 pr-1.5 h-8">
          <span className="text-gray-500 shrink-0"><IconSearch /></span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
            placeholder={t("console.findPlaceholder")}
            className="w-40 bg-transparent text-[13px] text-gray-200 placeholder-gray-500 outline-none"
          />
          <span className="hint min-w-[3.5rem] text-right tabular-nums">
            {search.trim() ? t.plural("console.matches", matchCount) : t("console.noResults")}
          </span>
          <button onClick={() => setShowSearch(false)} className="btn btn-invisible btn-sm btn-icon" title={t("console.close")}>
            <IconX />
          </button>
        </div>
      )}

      <div className="bar">
        <div className="flex items-center gap-2">
          <span className="bar-title">{t("console.title")}</span>
          {isRunning && (
            <span className="badge bg-brand-900 border-brand-500/30 text-brand-300 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              {t("console.running")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleCopy}
            disabled={!allContentLines.length}
            className="btn btn-invisible btn-sm"
            title={t("console.copyTitle")}
          >
            {copied ? t("console.copied") : t("console.copy")}
          </button>
          <button
            onClick={() => setShowSearch((v) => !v)}
            aria-pressed={showSearch}
            className={`btn btn-sm ${showSearch ? "btn-default text-brand-300" : "btn-invisible"}`}
          >
            {t("console.find")}
          </button>
          <button onClick={clearOutput} className="btn btn-invisible btn-sm">{t("console.clear")}</button>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        {showScrollTopBtn && (
          <button onClick={scrollToTop} className="btn btn-default btn-icon rounded-full shadow-lg" title={t("editor.scrollTop")}>
            <IconArrowUp />
          </button>
        )}
        {showScrollBtn && (
          <button onClick={scrollToBottom} className="btn btn-default btn-icon rounded-full shadow-lg" title={t("editor.scrollBottom")}>
            <IconArrowDown />
          </button>
        )}
      </div>

      <div ref={scrollRef} onScroll={checkAtBottom} className="flex-1 overflow-y-auto py-2">
        {isEmpty ? (
          <div className="hint px-4 py-3">{t("console.empty")}</div>
        ) : search.trim() ? (
          filteredLines.length === 0 ? (
            <div className="hint px-4 py-3">{t("console.noMatch", { q: search })}</div>
          ) : (
            filteredLines.map((line, i) => (
              <Line key={`search-${line.timestamp}-${i}`} line={line} searchQuery={search} fontSize={settings.fontSize} />
            ))
          )
        ) : (
          runs.map((run, idx) => {
            const collapsed = collapsedRuns.has(idx);
            const isActive = idx === runs.length - 1 && isRunning;
            return (
              <div key={`run-${run.separator.timestamp}`}>
                {runs.length > 1 && (
                  <RunHeader run={run} idx={idx} collapsed={collapsed} onToggle={toggleRun} isActive={isActive} />
                )}
                {!collapsed && run.lines.map((line, i) => (
                  <Line key={`${line.timestamp}-${i}`} line={line} searchQuery="" fontSize={settings.fontSize} />
                ))}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
