import { useEffect, useRef } from "react";
import { useAiChat } from "../../hooks/useAiChat";
import { useStore } from "../../store";
import { useT, type Translator } from "../../lib/i18n";
import { IconX } from "../icons";
import type { AiMessage } from "../../types";

function isPureCode(content: string): boolean {
  return !content.includes("```");
}

interface BubbleProps {
  msg: AiMessage;
  isLastStreaming: boolean;
  onInsert: (code: string) => void;
}

function MessageBubble({ msg, isLastStreaming, onInsert }: BubbleProps) {
  const t = useT();

  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] px-3 py-2 rounded-lg rounded-br-sm bg-brand-900 border border-brand-500/25 text-[13px] text-gray-200 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  if (!msg.content && isLastStreaming) {
    return (
      <div className="mb-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  const pure = msg.content ? isPureCode(msg.content) : false;

  if (pure) {
    return (
      <div className="mb-3">
        <pre className="bg-surface-900 border border-surface-600 rounded-lg p-3 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
          {msg.content}
        </pre>
        <button onClick={() => onInsert(msg.content)} className="btn btn-default btn-sm mt-1.5 w-full">
          {t("ai.insert")}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 text-[13px] text-gray-200 leading-relaxed">
      {renderMixed(msg.content, onInsert, t)}
    </div>
  );
}

function renderMixed(content: string, onInsert: (code: string) => void, t: Translator) {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const fenceMatch = part.match(/^```([\w]*)\n([\s\S]*)```$/);
    if (fenceMatch) {
      const code = fenceMatch[2].trim();
      return (
        <div key={i} className="my-2">
          <pre className="bg-surface-900 border border-surface-600 rounded-lg p-3 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
            {code}
          </pre>
          <button onClick={() => onInsert(code)} className="btn btn-invisible btn-sm mt-1 -ml-2">
            {t("ai.insert")}
          </button>
        </div>
      );
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  openai: "OpenAI",
  groq: "Groq",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

interface AiChatProps {
  onInsertCode: (code: string) => void;
}

export function AiChat({ onInsertCode }: AiChatProps) {
  const { aiMessages, aiStreaming, settings, toggleAiChat } = useStore();
  const { send, clearChat } = useAiChat();
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const configured = !!(settings.aiProvider && settings.aiApiKey && settings.aiModel);
  const providerLabel = settings.aiProvider ? (PROVIDER_LABELS[settings.aiProvider] ?? settings.aiProvider) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages.length, aiStreaming]);

  const handleSend = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text || aiStreaming) return;
    el.value = "";
    el.style.height = "auto";
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-surface-800">
      <div className="bar">
        <div className="flex items-center gap-2">
          <span className="bar-title">{t("ai.title")}</span>
          {providerLabel && (
            <span className="badge bg-surface-700 border-surface-600 text-gray-400">{providerLabel}</span>
          )}
          {aiStreaming && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-brand-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {aiMessages.length > 0 && !aiStreaming && (
            <button onClick={clearChat} className="btn btn-invisible btn-sm">{t("ai.clear")}</button>
          )}
          <button onClick={toggleAiChat} className="btn btn-invisible btn-sm btn-icon" title={t("ai.close")}>
            <IconX />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {aiMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="hint text-center">
              {configured
                ? t("ai.emptyConfigured")
                : t("ai.emptyUnconfigured")}
            </p>
          </div>
        ) : (
          <>
            {aiMessages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLastStreaming={aiStreaming && i === aiMessages.length - 1}
                onInsert={onInsertCode}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="px-3 py-2 border-t border-surface-600 shrink-0">
        {!configured ? (
          <p className="hint text-center py-1">{t("ai.needsKey")}</p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={t("ai.placeholder")}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={aiStreaming}
              className="input flex-1 h-auto py-1.5 resize-none disabled:opacity-50"
              style={{ minHeight: "32px", maxHeight: "120px", overflow: "hidden" }}
            />
            <button onClick={handleSend} disabled={aiStreaming} className="btn btn-primary shrink-0">
              {t("ai.send")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
