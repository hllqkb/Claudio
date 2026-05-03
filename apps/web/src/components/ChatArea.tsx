import { useEffect, useRef } from "react";
import { useChatStore, type ChatMessage, type RecommendedSong } from "../stores/chatStore";
import { usePlayerStore } from "../stores/playerStore";
import type { QueueItem } from "../api/client";

export default function ChatArea() {
    const { messages, streamingText, streamingSongs, isStreaming, error } = useChatStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText, streamingSongs]);

    return (
        <div className="chat-area">
            <div className="chat-messages" ref={containerRef}>
                {messages.length === 0 && !streamingText && (
                    <div className="chat-welcome">
                        <div className="chat-welcome-avatar">🎵</div>
                        <div className="chat-welcome-title">Hey, 我是 Claudio</div>
                        <div className="chat-welcome-desc">
                            你的私人 AI 音乐助手，告诉我你现在想听什么～
                        </div>
                        <div className="chat-welcome-hints">
                            <ChatHint text="来点轻松的音乐" />
                            <ChatHint text="推荐几首适合写代码的歌" />
                            <ChatHint text="今天心情不太好，想听点治愈的" />
                            <ChatHint text="来点周杰伦的歌" />
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Streaming AI response */}
                {isStreaming && (streamingText || streamingSongs.length > 0) && (
                    <div className="chat-bubble ai">
                        <div className="chat-avatar ai">🎵</div>
                        <div className="chat-content">
                            {streamingText && (
                                <div className="chat-text streaming">
                                    {streamingText}
                                    <span className="stream-cursor">▊</span>
                                </div>
                            )}
                            {streamingSongs.length > 0 && (
                                <div className="song-cards">
                                    {streamingSongs.map((song, i) => (
                                        <SongCard key={song.id} song={song} index={i} isStreaming />
                                    ))}
                                    <div className="song-cards-loading">正在搜索更多歌曲...</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="chat-bubble system-error">
                        <div className="chat-text">⚠️ {error}</div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function ChatBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";
    const isDj = message.role === "dj";

    return (
        <div className={`chat-bubble ${message.role}`}>
            {isUser ? (
                <>
                    <div className="chat-content">
                        <div className="chat-text">{message.text}</div>
                    </div>
                    <div className="chat-avatar user">U</div>
                </>
            ) : isDj ? (
                <>
                    <div className="chat-avatar dj">🎧</div>
                    <div className="chat-content">
                        <div className="chat-text">{message.text}</div>
                    </div>
                </>
            ) : (
                <>
                    <div className="chat-avatar ai">🎵</div>
                    <div className="chat-content">
                        <div className="chat-text">{message.text}</div>
                        {message.songs && message.songs.length > 0 && (
                            <div className="song-cards">
                                {message.songs.map((song, i) => (
                                    <SongCard key={song.id} song={song} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ChatHint({ text }: { text: string }) {
    const send = useChatStore((s) => s.send);
    const isStreaming = useChatStore((s) => s.isStreaming);

    return (
        <button
            className="chat-hint"
            onClick={() => send(text)}
            disabled={isStreaming}
        >
            {text}
        </button>
    );
}

function SongCard({ song, index, isStreaming }: { song: RecommendedSong; index: number; isStreaming?: boolean }) {
    const playItem = usePlayerStore((s) => s.playItem);

    const handleClick = () => {
        if (!song.audioUrl) return;
        const item: QueueItem = {
            id: song.id,
            type: "song",
            songId: song.songId,
            title: song.title,
            artist: song.artist,
            coverUrl: song.coverUrl,
            audioUrl: song.audioUrl,
            status: "pending",
        };
        playItem(item);
    };

    return (
        <div
            className={`song-card ${isStreaming ? "streaming" : ""}`}
            style={{ animationDelay: `${index * 80}ms` }}
            onClick={handleClick}
        >
            <div className="song-card-cover">
                {song.coverUrl ? (
                    <img src={song.coverUrl} alt={song.title} loading="lazy" />
                ) : (
                    <div className="song-card-cover-placeholder">♫</div>
                )}
                <div className="song-card-play-overlay">▶</div>
            </div>
            <div className="song-card-info">
                <div className="song-card-title">{song.title}</div>
                <div className="song-card-artist">{song.artist}</div>
                {song.reason && (
                    <div className="song-card-reason">💡 {song.reason}</div>
                )}
            </div>
        </div>
    );
}
