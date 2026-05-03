import { useState, useCallback } from "react";
import { api } from "../api/client";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";

interface Props {
  onResponse?: (text: string) => void;
  onUserMessage?: (text: string) => void;
}

export default function IntentInput({ onResponse, onUserMessage }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const addDjMessage = usePlayerStore((s) => s.addDjMessage);
  const { t } = useI18n();

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const userInput = text.trim();
    setText("");

    onUserMessage?.(userInput);

    try {
      const result = await api.postIntent(userInput);

      if (result.summary) {
        onResponse?.(result.summary);
      }

      if (result.items) {
        for (const item of result.items) {
          if (item.type === "tts" && item.text) {
            addDjMessage(item.text);
          }
        }
      }

      const songs = (result.items ?? []).filter((i) => i.type === "song");
      if (songs.length > 0) {
        setQueue(songs);
      }
    } catch {
      onResponse?.("Sorry, something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, setQueue, addDjMessage, onResponse, onUserMessage]);

  return (
    <div className="chat-input-bar">
      <input
        type="text"
        className="chat-input"
        placeholder={t("intentPlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={submitting}
      />
      <button className="chat-send-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "..." : "→"}
      </button>
    </div>
  );
}
