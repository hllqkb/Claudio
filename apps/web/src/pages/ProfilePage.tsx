import { useEffect, useState, useCallback } from "react";
import { api, type FullProfileResponse, type ProfilePreferences } from "../api/client";
import { useI18n } from "../i18n/context";
import type { TranslationKey } from "../i18n/translations";

function BarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  const max = Math.max(...Object.values(data), 1);
  return (
    <div>
      {entries.map(([key, val]) => (
        <div key={key} className="bar-row">
          <span className="bar-label">{key}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(val / max) * 100}%` }} />
          </div>
          <span className="bar-value">{val}%</span>
        </div>
      ))}
    </div>
  );
}

function TagEditor({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="pref-section">
      <div className="pref-section-label">{label}</div>
      <div className="tag-pills">
        {tags.map((tag) => (
          <span key={tag} className="tag-pill tag-pill-removable" onClick={() => removeTag(tag)}>
            {tag}
            <span className="tag-pill-x">&times;</span>
          </span>
        ))}
        <div className="tag-input-wrap">
          <input
            className="tag-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {input.trim() && (
            <button className="tag-add-btn" onClick={addTag}>+</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<FullProfileResponse | null>(null);
  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    api.getFullProfile().then((d) => {
      setData(d);
      setPrefs(d.preferences);
    }).catch((err) => {
      console.error(err);
      setError(true);
    });
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updateProfilePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!data || !prefs) {
    return (
      <div className="main-inner">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar"><span style={{ fontSize: 28 }}>&#127925;</span></div>
            <div className="profile-name-block">
              <div className="profile-name">Claudio</div>
            </div>
          </div>
          <div className="profile-desc">{t("profileSubtitle")}</div>
          <div className="profile-section">
            <div className="empty-state">{error ? t("emptyProfile") : t("loading")}</div>
          </div>
        </div>
      </div>
    );
  }

  const { stats, dailyRecommendations } = data;
  const hasData = stats.totalPlays > 0;
  const maxCount = Math.max(...stats.topArtists.map((a) => a.count), 1);

  return (
    <div className="main-inner">
      <div className="ambient-mesh">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span style={{ fontSize: 28 }}>&#127925;</span>
          </div>
          <div className="profile-name-block">
            <div className="profile-name">Claudio</div>
            <div className="profile-status">
              <span className="dj-status-dot" />
              {t("iSpinOnBoot")}
            </div>
          </div>
        </div>

        <div className="profile-desc">{t("profileSubtitle")}</div>

        {/* ===== Section 1: Music Profile (read-only) ===== */}
        <div className="profile-section">
          <div className="profile-section-title">{t("musicProfile")}</div>

          <div className="profile-stats">
            <div className="stat-cell">
              <div className="stat-value">{stats.totalPlays}</div>
              <div className="stat-label">{t("totalPlays")}</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.totalMinutes}</div>
              <div className="stat-label">{t("totalMinutes")}</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.favoriteCount}</div>
              <div className="stat-label">{t("favoriteCount")}</div>
            </div>
          </div>

          {!hasData && (
            <div className="empty-state">{t("emptyProfile")}</div>
          )}

          {/* Top Artists */}
          {stats.topArtists.length > 0 && (
            <div className="profile-subsection">
              <div className="profile-subsection-title">{t("topArtists")}</div>
              {stats.topArtists.slice(0, 5).map((a, i) => (
                <div key={a.name} className="artist-row">
                  <span className="artist-rank">{i + 1}</span>
                  <span className="artist-name">{a.name}</span>
                  <div className="artist-bar">
                    <div className="artist-bar-fill" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="artist-count">{a.count}x</span>
                </div>
              ))}
            </div>
          )}

          {/* Mood Preference */}
          {Object.keys(stats.moodPreference).length > 0 && (
            <div className="profile-subsection">
              <div className="profile-subsection-title">{t("mood")}</div>
              <BarChart data={stats.moodPreference} />
            </div>
          )}

          {/* Recent Themes */}
          {stats.recentThemes.length > 0 && (
            <div className="profile-subsection">
              <div className="profile-subsection-title">{t("recentThemes")}</div>
              <div className="tag-pills">
                {stats.recentThemes.map((th) => (
                  <span key={th} className="tag-pill">{th}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== Section 2: Editable Preferences ===== */}
        <div className="profile-section">
          <div className="profile-section-title">{t("myPreferences")}</div>

          <TagEditor
            label={t("favoriteGenres")}
            tags={prefs.favoriteGenres}
            onChange={(v) => setPrefs({ ...prefs, favoriteGenres: v })}
            placeholder={t("addTag")}
          />
          <TagEditor
            label={t("dislikedGenres")}
            tags={prefs.dislikedGenres}
            onChange={(v) => setPrefs({ ...prefs, dislikedGenres: v })}
            placeholder={t("addTag")}
          />
          <TagEditor
            label={t("preferredScenes")}
            tags={prefs.preferredScenes}
            onChange={(v) => setPrefs({ ...prefs, preferredScenes: v })}
            placeholder={t("addTag")}
          />
          <TagEditor
            label={t("preferredMoods")}
            tags={prefs.preferredMoods}
            onChange={(v) => setPrefs({ ...prefs, preferredMoods: v })}
            placeholder={t("addTag")}
          />

          <div className="pref-section">
            <div className="pref-section-label">{t("userNote")}</div>
            <textarea
              className="pref-textarea"
              value={prefs.userNote}
              onChange={(e) => setPrefs({ ...prefs, userNote: e.target.value })}
              rows={3}
            />
          </div>

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : saved ? t("preferencesSaved") : t("savePreferences")}
          </button>
        </div>

        {/* ===== Section 3: Daily Recommendations History ===== */}
        <div className="profile-section">
          <div className="profile-section-title">{t("dailyHistory")}</div>
          {dailyRecommendations.length === 0 ? (
            <div className="empty-state">{t("noRecommendations")}</div>
          ) : (
            <div className="daily-rec-list">
              {dailyRecommendations.slice(-7).reverse().map((rec) => (
                <div key={rec.date} className="daily-rec-item">
                  <div className="daily-rec-date">{rec.date}</div>
                  <div className="daily-rec-count">{rec.songIds.length} songs</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
