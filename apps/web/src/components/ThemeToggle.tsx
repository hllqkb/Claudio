import { useState } from "react";

interface Props {
  isDark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ isDark, onToggle }: Props) {
  const [rotating, setRotating] = useState(false);

  const handleClick = () => {
    setRotating(true);
    onToggle();
    setTimeout(() => setRotating(false), 500);
  };

  return (
    <button
      className={`theme-toggle ${rotating ? "rotating" : ""}`}
      onClick={handleClick}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
