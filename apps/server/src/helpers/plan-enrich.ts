import type { PlanItem } from "../services/claude.service.js";
import type { NcmService } from "../services/ncm.service.js";
import type { TtsService } from "../services/tts.service.js";

export interface EnrichedItem {
  id: string;
  type: "song" | "tts" | "silence";
  songId?: string;
  query?: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
  text?: string;
  reason?: string;
  audioUrl: string;
  status: "pending";
}

export async function enrichPlanItems(
  ncm: NcmService,
  tts: TtsService,
  items: PlanItem[],
  planId: string
): Promise<EnrichedItem[]> {
  const result: EnrichedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const baseItem: EnrichedItem = {
      ...item,
      id: `${planId}_${i}`,
      audioUrl: item.audioUrl ?? "",
      status: "pending",
    };

    if (item.type === "song" && item.query) {
      const songs = await ncm.search(item.query, 1);
      if (songs.length > 0) {
        const song = songs[0];
        baseItem.songId = song.id;
        baseItem.title = song.title;
        baseItem.artist = song.artist;
        baseItem.coverUrl = song.coverUrl;
        baseItem.audioUrl = `/api/audio?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`;
      }
    }

    if (item.type === "tts" && item.text) {
      const ttsUrl = await tts.synthesize(item.text);
      if (ttsUrl) {
        baseItem.audioUrl = ttsUrl;
      }
    }

    result.push(baseItem);
  }

  return result;
}
