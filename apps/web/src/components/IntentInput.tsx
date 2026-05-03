import { useState } from "react";
import { api } from "../api/client";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";

export default function IntentInput() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fetchNow = usePlayerStore((s) => s.fetchNow);
  const { t } = useI18n();

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.postIntent(text.trim());
      alert(result.message);
      setText("");
      fetchNow();
    } catch {
      alert(t("sendFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="intent-input">
      <input
        type="text"
        placeholder={t("intentPlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? t("sending") : t("send")}
      </button>
    </div>
  );
}
