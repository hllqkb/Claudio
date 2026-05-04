import { create } from "zustand";
import type { QueueItem } from "../api/client";
import { api } from "../api/client";
import { useToastStore } from "./toastStore";

export interface ChatMessage {
    id: string;
    role: "user" | "ai" | "dj";
    text: string;
    ts: number;
    /** Recommended songs shown inline with AI message */
    songs?: RecommendedSong[];
}

export interface RecommendedSong {
    id: string;
    songId?: string;
    title: string;
    artist: string;
    coverUrl?: string;
    reason?: string;
    audioUrl?: string;
}

interface ChatState {
    messages: ChatMessage[];
    streamingText: string;
    streamingSongs: RecommendedSong[];
    isStreaming: boolean;
    error: string | null;

    loadHistory: () => Promise<void>;
    send: (text: string) => void;
    abort: () => void;
    clear: () => void;
}

let currentAbort: AbortController | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    streamingText: "",
    streamingSongs: [],
    isStreaming: false,
    error: null,

    loadHistory: async () => {
        try {
            const { messages } = await api.getChatMessages(50);
            if (messages.length > 0) {
                set({
                    messages: messages.map((m) => ({
                        id: m.id,
                        role: m.role as ChatMessage["role"],
                        text: m.text,
                        ts: m.ts,
                        songs: m.songs as RecommendedSong[] | undefined,
                    })),
                });
            }
        } catch (err) {
            console.warn("[chat] Failed to load history:", err);
        }
    },

    send: (text: string) => {
        const { isStreaming } = get();
        if (isStreaming) return;

        // Add user message
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}`,
            role: "user",
            text,
            ts: Date.now(),
        };

        set((s) => ({
            messages: [...s.messages, userMsg],
            streamingText: "",
            streamingSongs: [],
            isStreaming: true,
            error: null,
        }));

        // Persist user message
        api.saveChatMessage({ id: userMsg.id, role: "user", text }).catch(() => {});

        const collectedSongs: RecommendedSong[] = [];
        let collectedText = "";

        const controller = api.streamChat(text, {
            onStatus: (phase) => {
                if (phase === "thinking") {
                    set({ streamingText: "🎵 正在为你挑选音乐..." });
                }
            },

            onChunk: (chunk) => {
                collectedText += chunk;

                // If we haven't found the JSON block yet, display as streaming text
                // Once JSON starts (```), we stop updating streaming text
                const jsonStart = collectedText.indexOf("```");
                if (jsonStart >= 0) {
                    // Show only the conversational part before the JSON
                    const conversationalPart = collectedText.slice(0, jsonStart).trim();
                    set({ streamingText: conversationalPart });
                } else {
                    set({ streamingText: collectedText });
                }
            },

            onItem: (item: QueueItem) => {
                if (item.type === "song") {
                    const song: RecommendedSong = {
                        id: item.id,
                        songId: item.songId,
                        title: item.title ?? "Unknown",
                        artist: item.artist ?? "",
                        coverUrl: item.coverUrl,
                        reason: item.reason,
                        audioUrl: item.audioUrl,
                    };
                    collectedSongs.push(song);
                    set({ streamingSongs: [...collectedSongs] });
                }
            },

            onPlan: () => {
                // Plan metadata received — no action needed, items will follow
            },

            onDone: () => {
                // Finalize: create the AI message
                const jsonStart = collectedText.indexOf("```");
                const conversationalText = jsonStart >= 0
                    ? collectedText.slice(0, jsonStart).trim()
                    : collectedText;

                const aiMsg: ChatMessage = {
                    id: `ai_${Date.now()}`,
                    role: "ai",
                    text: conversationalText || "已为你生成播放列表 🎶",
                    ts: Date.now(),
                    songs: collectedSongs.length > 0 ? collectedSongs : undefined,
                };

                set((s) => ({
                    messages: [...s.messages, aiMsg],
                    streamingText: "",
                    streamingSongs: [],
                    isStreaming: false,
                }));

                // Persist AI message
                api.saveChatMessage({
                    id: aiMsg.id,
                    role: "ai",
                    text: aiMsg.text,
                    meta: aiMsg.songs,
                }).catch(() => {});
            },

            onError: (msg) => {
                set({
                    streamingText: "",
                    streamingSongs: [],
                    isStreaming: false,
                    error: msg,
                });
                useToastStore.getState().addToast("AI 对话出错", "error");
            },
        });

        currentAbort = controller;
    },

    abort: () => {
        currentAbort?.abort();
        currentAbort = null;

        const { streamingText, streamingSongs } = get();
        if (streamingText || streamingSongs.length > 0) {
            const aiMsg: ChatMessage = {
                id: `ai_${Date.now()}`,
                role: "ai",
                text: streamingText || "已中断",
                ts: Date.now(),
                songs: streamingSongs.length > 0 ? streamingSongs : undefined,
            };
            set((s) => ({
                messages: [...s.messages, aiMsg],
                streamingText: "",
                streamingSongs: [],
                isStreaming: false,
            }));
        }
    },

    clear: () => {
        currentAbort?.abort();
        currentAbort = null;
        set({
            messages: [],
            streamingText: "",
            streamingSongs: [],
            isStreaming: false,
            error: null,
        });
    },
}));
