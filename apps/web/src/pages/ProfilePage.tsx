import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n/context";
import GenreChip from "../components/GenreChip";

interface ProfileData {
  totalPlays: number;
  totalMinutes: number;
  favoriteCount: number;
  topArtists: Array<{ name: string; count: number }>;
  decadeDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  moodPreference: Record<string, number>;
  recentThemes: string[];
}

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
            <div
              className="bar-fill"
              style={{ width: `${(val / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{val}%</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    api.getProfile().then(setProfile).catch(console.error);
  }, []);

  if (!profile) {
    return (
      <div className="main-inner">
        <div className="loading-text">{t("loading")}</div>
      </div>
    );
  }

  const hasData = profile.totalPlays > 0;
  const maxCount = Math.max(...profile.topArtists.map((a) => a.count), 1);

  return (
    <div className="main-inner">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span style={{ fontSize: 28 }}>🎧</span>
          </div>
          <div className="profile-name-block">
            <div className="profile-name">Claudio</div>
            <div className="profile-status">
              <span className="dj-status-dot" />
              {t("iSpinOnBoot")}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="profile-desc">{t("profileSubtitle")}</div>

        {/* Mottos */}
        <div className="profile-motto">
          {t("profileMotto1")}
          <br />
          {t("profileMotto2")}
        </div>

        {/* Stats Cards */}
        <div className="profile-stats">
          <div className="stat-cell">
            <div className="stat-value">{profile.totalPlays}</div>
            <div className="stat-label">{t("totalPlays")}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">{profile.totalMinutes}</div>
            <div className="stat-label">{t("totalMinutes")}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">{profile.favoriteCount}</div>
            <div className="stat-label">{t("favoriteCount")}</div>
          </div>
        </div>

        {/* Empty State */}
        {!hasData && (
          <div className="profile-section">
            <div className="empty-state">{t("emptyProfile")}</div>
          </div>
        )}

        {/* Genre Chips — use moodPreference keys if available */}
        {Object.keys(profile.moodPreference).length > 0 && (
          <div className="genre-chips">
            {Object.keys(profile.moodPreference).map((g) => (
              <GenreChip key={g} label={g} />
            ))}
          </div>
        )}

        {/* Top Artists */}
        {profile.topArtists.length > 0 && (
          <div className="profile-section">
            <div className="profile-section-title">{t("topArtists")}</div>
            {profile.topArtists.map((a, i) => (
              <div key={a.name} className="artist-row">
                <span className="artist-rank">{i + 1}</span>
                <span className="artist-name">{a.name}</span>
                <div className="artist-bar">
                  <div
                    className="artist-bar-fill"
                    style={{ width: `${(a.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="artist-count">{a.count}x</span>
              </div>
            ))}
          </div>
        )}

        {/* Decades */}
        {Object.keys(profile.decadeDistribution).length > 0 && (
          <div className="profile-section">
            <div className="profile-section-title">{t("decades")}</div>
            <BarChart data={profile.decadeDistribution} />
          </div>
        )}

        {/* Languages */}
        {Object.keys(profile.languageDistribution).length > 0 && (
          <div className="profile-section">
            <div className="profile-section-title">{t("languages")}</div>
            <BarChart data={profile.languageDistribution} />
          </div>
        )}

        {/* Mood */}
        {Object.keys(profile.moodPreference).length > 0 && (
          <div className="profile-section">
            <div className="profile-section-title">{t("mood")}</div>
            <BarChart data={profile.moodPreference} />
          </div>
        )}

        {/* Recent Themes */}
        {profile.recentThemes.length > 0 && (
          <div className="profile-section">
            <div className="profile-section-title">{t("recentThemes")}</div>
            <div className="tag-pills">
              {profile.recentThemes.map((th) => (
                <span key={th} className="tag-pill">{th}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
