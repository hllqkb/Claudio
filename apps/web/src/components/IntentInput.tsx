import { useState, useCallback } from "react";
import { useChatStore } from "../stores/chatStore";

export default function IntentInput() {
  const [text, setText] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const send = useChatStore((s) => s.send);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isStreaming) return;
    const userInput = text.trim();
    setText("");
    send(userInput);
  }, [text, isStreaming, send]);

  return (
    <div className="chat-input-bar">
      <input
        type="text"
        className="chat-input"
        placeholder="告诉我你想听什么..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={isStreaming}
      />
      <button className="chat-send-btn" onClick={handleSubmit} disabled={isStreaming}>
        {isStreaming ? "..." : "→"}
      </button>
    </div>
  );
}
