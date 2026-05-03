import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n/context";
import GenreChip from "../components/GenreChip";

interface ProfileData {
  topArtists: Array<{ name: string; count: number }>;
  decadeDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  moodPreference: Record<string, number>;
  recentThemes: string[];
}

const defaultGenres = [
  "JAZZ-HIPHOP",
  "NEO-CLASSICAL",
  "90S华语",
  "HIP-HOP",
  "柴可夫斯基&EMINEM",
  "J-ROCK",
  "下雨白噪音",
  "POST-PUNK",
  "SHIBUYA-KEI",
];

function BarChart({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div>
      {Object.entries(data).map(([key, val]) => (
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

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-cell">
            <div className="stat-label">{t("onAirLabel")}</div>
            <div className="stat-value">{t("onAirValue")}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">{t("genresLabel")}</div>
            <div className="stat-value">{t("genresValue")}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">{t("listenerLabel")}</div>
            <div className="stat-value">{t("listenerValue")}</div>
          </div>
        </div>

        {/* Genre Chips */}
        <div className="genre-chips">
          {defaultGenres.map((g) => (
            <GenreChip key={g} label={g} />
          ))}
        </div>

        {/* Top Artists */}
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

        {/* Decades */}
        <div className="profile-section">
          <div className="profile-section-title">{t("decades")}</div>
          <BarChart data={profile.decadeDistribution} />
        </div>

        {/* Languages */}
        <div className="profile-section">
          <div className="profile-section-title">{t("languages")}</div>
          <BarChart data={profile.languageDistribution} />
        </div>

        {/* Mood */}
        <div className="profile-section">
          <div className="profile-section-title">{t("mood")}</div>
          <BarChart data={profile.moodPreference} />
        </div>

        {/* Recent Themes */}
        <div className="profile-section">
          <div className="profile-section-title">{t("recentThemes")}</div>
          <div className="tag-pills">
            {profile.recentThemes.map((th) => (
              <span key={th} className="tag-pill">{th}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
