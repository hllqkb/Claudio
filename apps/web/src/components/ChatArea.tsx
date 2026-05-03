import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerStore, type DjMessage } from "../stores/playerStore";

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "dj";
  text: string;
  ts: number;
}

interface Props {
  messages: ChatMessage[];
  streamingText: string;
}

export default function ChatArea({ messages, streamingText }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const djMessages = usePlayerStore((s) => s.djMessages);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, djMessages]);

  return (
    <div className="chat-area">
      <div className="chat-messages" ref={containerRef}>
        {messages.length === 0 && !streamingText && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">AI</div>
            <div className="chat-welcome-title">Claudio</div>
            <div className="chat-welcome-desc">
              Tell me what you want to listen to, and I'll create a playlist for you.
            </div>
            <div className="chat-welcome-hints">
              <span className="chat-hint">Try: "play some coding music"</span>
              <span className="chat-hint">Try: "relaxing piano for studying"</span>
              <span className="chat-hint">Try: "upbeat pop songs"</span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {djMessages.map((msg) => (
          <DjBubble key={msg.id} message={msg} />
        ))}

        {streamingText && (
          <div className="chat-bubble ai streaming">
            <div className="chat-avatar">AI</div>
            <div className="chat-content">
              <StreamingText text={streamingText} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-bubble ${message.role}`}>
      {!isUser && <div className="chat-avatar">AI</div>}
      <div className="chat-content">
        <div className="chat-text">{message.text}</div>
      </div>
      {isUser && <div className="chat-avatar user">U</div>}
    </div>
  );
}

function DjBubble({ message }: { message: DjMessage }) {
  return (
    <div className="chat-bubble dj">
      <div className="chat-avatar dj">DJ</div>
      <div className="chat-content">
        <div className="chat-text">{message.text}</div>
      </div>
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
  }, [text]);

  useEffect(() => {
    if (indexRef.current >= text.length) return;

    const timer = setInterval(() => {
      const chars = Array.from(text);
      if (indexRef.current < chars.length) {
        const chunkSize = Math.min(
          Math.floor(Math.random() * 2) + 1,
          chars.length - indexRef.current
        );
        indexRef.current += chunkSize;
        setDisplayed(chars.slice(0, indexRef.current).join(""));
      } else {
        clearInterval(timer);
      }
    }, 60);

    return () => clearInterval(timer);
  }, [text]);

  return (
    <div className="chat-streaming">
      {displayed}
      <span className="stream-cursor">|</span>
    </div>
  );
}
