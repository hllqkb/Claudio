import { useEffect, useState, useCallback, useRef } from "react";
import { api, type HealthResponse } from "../api/client";
import { useI18n } from "../i18n/context";

const SERVICE_META: Record<string, { icon: string; label: string }> = {
  ncm:       { icon: "☁️",  label: "Netease Cloud Music" },
  claude:    { icon: "🤖",  label: "Claude AI" },
  tts:       { icon: "🎙️",  label: "Fish Audio TTS" },
  weather:   { icon: "🌤️",  label: "OpenWeather" },
  calendar:  { icon: "📅",  label: "Feishu Calendar" },
};

type Field = {
  key: string;
  label: string;
  sensitive: boolean;
  service: string;
  placeholder?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { t } = useI18n();

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  const updateSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Auto-save with debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const newSettings = { ...settings, [key]: value };
        await api.putSettings(newSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [settings]);

  const toggleSetting = useCallback((key: string) => {
    const current = settings[key] ?? "true";
    updateSetting(key, current === "true" ? "false" : "true");
  }, [settings, updateSetting]);

  // ── fields grouped by service ──
  const serviceFields: Record<string, Field[]> = {
    claude: [
      { key: "claude_api_key", label: "API Key", sensitive: true, service: "claude", placeholder: "sk-ant-..." },
      { key: "claude_base_url", label: "Base URL", sensitive: false, service: "claude", placeholder: "https://api.anthropic.com" },
      { key: "claude_model", label: "Model", sensitive: false, service: "claude", placeholder: "claude-sonnet-4-20250514" },
    ],
    ncm: [
      { key: "ncm_cookie", label: "Cookie (MUSIC_U)", sensitive: true, service: "ncm", placeholder: "未配置" },
      { key: "ncm_uid", label: "UID", sensitive: false, service: "ncm", placeholder: "8751366627" },
    ],
    tts: [
      { key: "fish_audio_api_key", label: "API Key", sensitive: true, service: "tts" },
      { key: "fish_audio_voice_id", label: "Voice ID", sensitive: false, service: "tts" },
    ],
    weather: [
      { key: "openweather_api_key", label: "API Key", sensitive: true, service: "weather" },
      { key: "openweather_city", label: "City", sensitive: false, service: "weather", placeholder: "Shanghai" },
    ],
    calendar: [
      { key: "feishu_app_id", label: "App ID", sensitive: false, service: "calendar" },
      { key: "feishu_app_secret", label: "App Secret", sensitive: true, service: "calendar" },
    ],
  };

  return (
    <div className="main-inner">
      <div className="settings-page">
        <div className="ambient-mesh">
          <div className="ambient-blob ambient-blob-1" />
          <div className="ambient-blob ambient-blob-2" />
          <div className="ambient-blob ambient-blob-3" />
        </div>

        {/* ── Header ── */}
        <div className="settings-header">
          <h1 className="settings-title">{t("settingsTitle")}</h1>
          {(saving || saved) && (
            <span className={`settings-save-badge ${saved ? "saved" : "saving"}`}>
              {saved ? "✓ Saved" : "Saving…"}
            </span>
          )}
        </div>

        {/* ── Service Status ── */}
        <div className="settings-section">
          <div className="settings-section-title">🔌 {t("serviceStatus")}</div>
          <div className="status-grid">
            {Object.entries(SERVICE_META).map(([key, meta]) => {
              const status = health?.services?.[key] ?? "unknown";
              const isConnected = status === "connected";
              return (
                <div key={key} className={`status-card ${isConnected ? "connected" : "mock"}`}>
                  <span className="status-icon">{meta.icon}</span>
                  <div className="status-info">
                    <span className="status-label">{meta.label}</span>
                    <span className="status-value">
                      {isConnected ? t("connected") : t("mockMode")}
                    </span>
                  </div>
                  <div className="status-dot" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── API Configuration (grouped by service) ── */}
        <div className="settings-section">
          <div className="settings-section-title">🔑 {t("apiConfig")}</div>
          {Object.entries(serviceFields).map(([serviceKey, fields]) => {
            const meta = SERVICE_META[serviceKey];
            const svcStatus = health?.services?.[serviceKey] ?? "unknown";
            return (
              <div key={serviceKey} className="settings-group">
                <div className="settings-group-header">
                  <span className="settings-group-icon">{meta.icon}</span>
                  <span className="settings-group-label">{meta.label}</span>
                  <span className={`settings-group-badge ${svcStatus === "connected" ? "connected" : ""}`}>
                    {svcStatus === "connected" ? "✓" : "—"}
                  </span>
                </div>
                <div className="settings-group-body">
                  {fields.map((field) => (
                    <div key={field.key} className="setting-field">
                      <label>{field.label}</label>
                      <input
                        type={field.sensitive ? "password" : "text"}
                        value={settings[field.key] ?? ""}
                        placeholder={field.placeholder ?? (field.sensitive ? t("notConfigured") : "")}
                        onChange={(e) => updateSetting(field.key, e.target.value)}
                        spellCheck={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Audio ── */}
        <div className="settings-section">
          <div className="settings-section-title">🎵 {t("audioSettings")}</div>
          <div className="settings-group">
            <div className="settings-group-body">
              <div className="setting-field">
                <label>{t("audioQuality")}</label>
                <select
                  className="setting-select"
                  value={settings["audio_quality"] ?? "128"}
                  onChange={(e) => updateSetting("audio_quality", e.target.value)}
                >
                  <option value="128">{t("qualityStandard")}</option>
                  <option value="320">{t("qualityHigh")}</option>
                  <option value="lossless">{t("qualityLossless")}</option>
                </select>
              </div>
              <div className="setting-field">
                <label>{t("ttsFreqLabel")}</label>
                <select
                  className="setting-select"
                  value={settings["tts_frequency"] ?? "always"}
                  onChange={(e) => updateSetting("tts_frequency", e.target.value)}
                >
                  <option value="always">Always</option>
                  <option value="first">First Only</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visualization ── */}
        <div className="settings-section">
          <div className="settings-section-title">🎨 {t("spectrumSettings")}</div>
          <div className="settings-group">
            <div className="settings-group-body">
              <div className="setting-field setting-toggle-row">
                <label>{t("spectrumEnabled")}</label>
                <button
                  className={`toggle-switch ${(settings["spectrum_enabled"] ?? "true") === "true" ? "on" : "off"}`}
                  onClick={() => toggleSetting("spectrum_enabled")}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI ── */}
        <div className="settings-section">
          <div className="settings-section-title">🤖 {t("aiSettings")}</div>
          <div className="settings-group">
            <div className="settings-group-body">
              <div className="setting-field">
                <label>{t("aiLanguage")}</label>
                <select
                  className="setting-select"
                  value={settings["ai_language"] ?? "zh"}
                  onChange={(e) => updateSetting("ai_language", e.target.value)}
                >
                  <option value="zh">🇨🇳 中文</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="ja">🇯🇵 日本語</option>
                </select>
              </div>
              <div className="setting-field setting-toggle-row">
                <label>{t("dailyRecommend")}</label>
                <button
                  className={`toggle-switch ${(settings["daily_recommend_enabled"] ?? "true") === "true" ? "on" : "off"}`}
                  onClick={() => toggleSetting("daily_recommend_enabled")}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── About ── */}
        <div className="settings-section">
          <div className="settings-section-title">ℹ️ {t("about")}</div>
          <div className="about-card">
            <div className="about-logo">
              <span style={{ fontSize: 28 }}>🎵</span>
              <div>
                <div className="about-app-name">Claudio</div>
                <div className="about-app-desc">AI Radio · v1.0.0</div>
              </div>
            </div>
            <div className="about-rows">
              <div className="about-row">
                <span className="about-label">Stack</span>
                <span className="about-value">Fastify + React + SQLite + Claude</span>
              </div>
              <div className="about-row">
                <span className="about-label">GitHub</span>
                <a className="about-link" href="https://github.com/hllqkb/Claudio" target="_blank" rel="noopener noreferrer">
                  hllqkb/Claudio →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
