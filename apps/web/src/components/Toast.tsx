import { useToastStore } from "../stores/toastStore";
import { useShortcutHint } from "../hooks/useKeyboard";

export function ShortcutHintBar() {
  const hint = useShortcutHint();
  if (!hint) return null;
  return (
    <div className="shortcut-hint" key={hint.ts}>
      {hint.text}
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
