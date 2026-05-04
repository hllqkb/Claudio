import { useEffect, useState } from "react";
import { api, type HealthResponse } from "../api/client";
import { useI18n } from "../i18n/context";

const SERVICE_LABELS: Record<string, string> = {
  ncm: "Netease Cloud Music",
  claude: "Claude AI",
  tts: "Fish Audio TTS",
  weather: "OpenWeather",
  calendar: "Feishu Calendar",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.putSettings(settings);
      const newHealth = await api.getHealth();
      setHealth(newHealth);
      alert(t("saveSuccess"));
    } catch {
      alert(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const fields = [
    { key: "claude_api_key", label: "Claude API Key", sensitive: true, service: "claude" },
    { key: "claude_base_url", label: "Claude Base URL", sensitive: false, service: "claude" },
    { key: "claude_model", label: "Claude Model", sensitive: false, service: "claude" },
    { key: "fish_audio_api_key", label: "Fish Audio API Key", sensitive: true, service: "tts" },
    { key: "fish_audio_voice_id", label: "Fish Audio Voice ID", sensitive: false, service: "tts" },
    { key: "openweather_api_key", label: "OpenWeather API Key", sensitive: true, service: "weather" },
    { key: "openweather_city", label: "City", sensitive: false, service: "weather" },
    { key: "ncm_cookie", label: "Netease Cookie", sensitive: true, service: "ncm" },
    { key: "ncm_uid", label: "Netease UID", sensitive: false, service: "ncm" },
    { key: "feishu_app_id", label: "Feishu App ID", sensitive: false, service: "calendar" },
    { key: "feishu_app_secret", label: "Feishu App Secret", sensitive: true, service: "calendar" },
    { key: "tts_frequency", label: t("ttsFreqLabel"), sensitive: false, service: "" },
  ];

  const toggleSetting = (key: string) => {
    const current = settings[key] ?? "true";
    updateSetting(key, current === "true" ? "false" : "true");
  };

  return (
    <div className="main-inner">
      <div className="settings-page">
        <div className="ambient-mesh">
          <div className="ambient-blob ambient-blob-1" />
          <div className="ambient-blob ambient-blob-2" />
          <div className="ambient-blob ambient-blob-3" />
        </div>
        <div className="settings-title">{t("settingsTitle")}</div>

        {/* Service Status */}
        <div className="settings-section">
          <div className="settings-section-title">{t("serviceStatus")}</div>
          <div className="status-grid">
            {Object.entries(SERVICE_LABELS).map(([key, label]) => {
              const status = health?.services?.[key] ?? "unknown";
              const isConnected = status === "connected";
              return (
                <div key={key} className={`status-card ${isConnected ? "connected" : "mock"}`}>
                  <div className="status-dot" />
                  <div className="status-info">
                    <span className="status-label">{label}</span>
                    <span className="status-value">
                      {isConnected ? t("connected") : t("mockMode")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Configuration */}
        <div className="settings-section">
          <div className="settings-section-title">{t("apiConfig")}</div>
          {fields.map((field) => (
            <div key={field.key} className="setting-field">
              <label>
                {field.label}
                {field.service && (
                  <span
                    className={`field-status ${
                      health?.services?.[field.service] === "connected" ? "connected" : ""
                    }`}
                  />
                )}
              </label>
              <input
                type={field.sensitive ? "password" : "text"}
                value={settings[field.key] ?? ""}
                placeholder={field.sensitive ? t("notConfigured") : ""}
                onChange={(e) => updateSetting(field.key, e.target.value)}
              />
            </div>
          ))}
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </button>
        </div>

        {/* Audio Settings */}
        <div className="settings-section">
          <div className="settings-section-title">{t("audioSettings")}</div>
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
        </div>

        {/* Visualization Settings */}
        <div className="settings-section">
          <div className="settings-section-title">{t("spectrumSettings")}</div>
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

        {/* AI Assistant Settings */}
        <div className="settings-section">
          <div className="settings-section-title">{t("aiSettings")}</div>
          <div className="setting-field">
            <label>{t("aiLanguage")}</label>
            <select
              className="setting-select"
              value={settings["ai_language"] ?? "zh"}
              onChange={(e) => updateSetting("ai_language", e.target.value)}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
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

        {/* About */}
        <div className="settings-section">
          <div className="settings-section-title">{t("about")}</div>
          <div className="about-info">
            <div className="about-row">
              <span className="about-label">{t("version")}</span>
              <span className="about-value">1.0.0</span>
            </div>
            <div className="about-row">
              <span className="about-label">GitHub</span>
              <a className="about-link" href="https://github.com/hllqkb/Claudio" target="_blank" rel="noopener noreferrer">
                hllqkb/Claudio
              </a>
            </div>
            <div className="about-row">
              <span className="about-label">Stack</span>
              <span className="about-value">Fastify + React + SQLite + Claude AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
