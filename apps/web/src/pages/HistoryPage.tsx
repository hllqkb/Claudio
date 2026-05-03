import { useEffect, useState } from "react";
import { api, type RecentPlay } from "../api/client";
import { usePlayerStore } from "../stores/playerStore";
import { Skeleton } from "../components/Skeleton";

function groupByDate(plays: RecentPlay[]): Map<string, RecentPlay[]> {
    const groups = new Map<string, RecentPlay[]>();
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();

    for (const play of plays) {
        const d = new Date(play.createdAt);
        const dateStr = d.toDateString();
        let label: string;
        if (dateStr === today) {
            label = "Today";
        } else if (dateStr === yesterday) {
            label = "Yesterday";
        } else {
            label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push(play);
    }
    return groups;
}

function formatPlayTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function HistoryPage() {
    const [plays, setPlays] = useState<RecentPlay[]>([]);
    const [loading, setLoading] = useState(true);
    const playItem = usePlayerStore((s) => s.playItem);

    useEffect(() => {
        api.getRecentPlays(100)
            .then((res) => setPlays(res.plays))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handlePlay = (play: RecentPlay) => {
        if (!play.songId) return;
        playItem({
            id: `hist_${play.id}`,
            type: "song",
            songId: play.songId,
            title: play.title ?? undefined,
            artist: play.artist ?? undefined,
            coverUrl: play.coverUrl ?? undefined,
            status: "playing",
        });
    };

    const grouped = groupByDate(plays);

    return (
        <div className="history-page">
            <div className="history-header">
                <div className="history-title">History</div>
                <div className="history-count">{plays.length} plays</div>
            </div>

            {loading ? (
                <div className="history-skeleton">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="history-item skeleton-card" style={{ animationDelay: `${i * 0.04}s` }}>
                            <Skeleton width="44px" height="44px" borderRadius="8px" />
                            <div style={{ flex: 1 }}>
                                <Skeleton width="70%" height="14px" />
                                <Skeleton width="40%" height="12px" />
                            </div>
                            <Skeleton width="40px" height="12px" />
                        </div>
                    ))}
                </div>
            ) : plays.length === 0 ? (
                <div className="history-empty">
                    <div className="history-empty-icon">--</div>
                    <div className="history-empty-text">No play history yet</div>
                </div>
            ) : (
                Array.from(grouped.entries()).map(([date, items]) => (
                    <div key={date} className="history-group">
                        <div className="history-group-date">{date}</div>
                        <div className="history-group-items">
                            {items.map((play) => (
                                <div
                                    key={play.id}
                                    className={`history-item ${play.songId ? "clickable" : ""}`}
                                    onClick={() => handlePlay(play)}
                                >
                                    <div className="history-item-cover">
                                        {play.coverUrl ? (
                                            <img src={play.coverUrl} alt="" loading="lazy" />
                                        ) : (
                                            <div className="history-item-cover-fallback">
                                                <span>--</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="history-item-info">
                                        <div className="history-item-title">{play.title ?? "Unknown"}</div>
                                        <div className="history-item-artist">{play.artist ?? ""}</div>
                                    </div>
                                    <div className="history-item-time">{formatPlayTime(play.createdAt)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
