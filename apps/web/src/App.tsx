import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "./i18n/context";
import { usePlayerStore } from "./stores/playerStore";
import { useKeyboard } from "./hooks/useKeyboard";
import { useTheme } from "./hooks/useTheme";
import ToastContainer, { ShortcutHintBar } from "./components/Toast";
import MiniPlayer from "./components/MiniPlayer";
import ThemeToggle from "./components/ThemeToggle";
import PlayerPage from "./pages/PlayerPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import PlaylistPage from "./pages/PlaylistPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);

  useKeyboard();

  const showMiniPlayer = !!nowPlaying && location.pathname !== "/";

  const navItems = [
    { path: "/", label: t("navHome") },
    { path: "/playlists", label: t("navPlaylists") },
    { path: "/history", label: t("navHistory") },
    { path: "/profile", label: t("navProfile") },
    { path: "/settings", label: t("navSettings") },
  ];

  return (
    <div className="app">
      {/* Fluid gradient background blobs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "70vmin",
            height: "70vmin",
            left: "50%",
            top: "50%",
            marginLeft: "-35vmin",
            marginTop: "-35vmin",
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%,
              rgba(94,232,197,0.06) 0%,
              rgba(60,180,160,0.03) 40%,
              transparent 70%)`,
            filter: "blur(100px)",
            animation: "fluidMove1 26s cubic-bezier(.45,.05,.55,.95) infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "55vmin",
            height: "55vmin",
            left: "50%",
            top: "50%",
            marginLeft: "-27vmin",
            marginTop: "-27vmin",
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%,
              rgba(100,100,200,0.04) 0%,
              rgba(80,80,180,0.02) 45%,
              transparent 70%)`,
            filter: "blur(80px)",
            animation: "fluidMove2 34s cubic-bezier(.45,.05,.55,.95) infinite",
          }}
        />
      </div>

      {/* Noise overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 1,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          mixBlendMode: "overlay" as const,
        }}
      />

      {/* Top Navigation */}
      <nav className="top-nav" style={{ zIndex: 100 }}>
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">AI</span>
          <span className="nav-logo-text">Claudio</span>
        </Link>

        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === "en" ? "ZH" : "EN"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`main-content ${showMiniPlayer ? "has-mini-player" : ""}`}>
        <Routes>
          <Route path="/" element={<PlayerPage />} />
          <Route path="/playlists" element={<PlaylistPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* MiniPlayer — fixed bottom bar when not on home page */}
      {showMiniPlayer && (
        <MiniPlayer onExpand={() => navigate("/")} />
      )}

      {/* Toast notifications */}
      <ToastContainer />

      {/* Keyboard shortcut hint */}
      <ShortcutHintBar />
    </div>
  );
}
