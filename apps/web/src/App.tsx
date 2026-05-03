import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useI18n } from "./i18n/context";
import PlayerPage from "./pages/PlayerPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const location = useLocation();
  const { t, lang, toggleLang } = useI18n();

  const navItems = [
    { path: "/", label: t("navHome") },
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
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === "en" ? "ZH" : "EN"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PlayerPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Fluid animation keyframes */}
      <style>{`
        @keyframes fluidMove1 {
          0%   { transform: translate(-22vmin, -14vmin) scale(1.00) rotate(0deg); }
          20%  { transform: translate(8vmin, -22vmin) scale(1.10) rotate(40deg); }
          40%  { transform: translate(24vmin, -4vmin) scale(0.95) rotate(80deg); }
          60%  { transform: translate(14vmin, 18vmin) scale(1.12) rotate(120deg); }
          80%  { transform: translate(-10vmin, 12vmin) scale(0.98) rotate(160deg); }
          100% { transform: translate(-22vmin, -14vmin) scale(1.00) rotate(360deg); }
        }
        @keyframes fluidMove2 {
          0%   { transform: translate(20vmin, 16vmin) scale(1.05) rotate(0deg); }
          20%  { transform: translate(-12vmin, 22vmin) scale(0.94) rotate(-40deg); }
          40%  { transform: translate(-26vmin, 2vmin) scale(1.14) rotate(-80deg); }
          60%  { transform: translate(-10vmin, -18vmin) scale(0.92) rotate(-120deg); }
          80%  { transform: translate(12vmin, -12vmin) scale(1.08) rotate(-160deg); }
          100% { transform: translate(20vmin, 16vmin) scale(1.05) rotate(-360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="animation"] { animation-duration: 180s !important; }
        }
      `}</style>
    </div>
  );
}
