import { usePlayerStore, type DjMessage } from "../stores/playerStore";

export default function DjMessages() {
  const djMessages = usePlayerStore((s) => s.djMessages);

  if (djMessages.length === 0) return null;

  return (
    <div className="dj-messages">
      {djMessages.map((msg, i) => (
        <DjMessageBubble key={msg.id} message={msg} index={i} />
      ))}
    </div>
  );
}

function DjMessageBubble({ message, index }: { message: DjMessage; index: number }) {
  return (
    <div
      className="dj-message"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="dj-message-icon">DJ</div>
      <div className="dj-message-text">{message.text}</div>
    </div>
  );
}
