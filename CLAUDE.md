# Claudio — AI Music Radio

## Architecture
- pnpm monorepo: apps/server (Fastify + TypeScript) + apps/web (React 19 + Vite + PWA)
- SQLite via better-sqlite3 for settings, playlists, plays history
- Claude AI for music planning, Fish Audio for TTS, Netease Cloud Music for songs
- WebSocket for real-time updates (now_playing, queue, DJ messages)

## Key Commands
- `pnpm dev` — start both server (:8080) and web (:5173) concurrently
- `pnpm --filter @claudio/server build` — build server
- `pnpm --filter @claudio/web build` — build web (outputs to apps/web/dist)
- `cd apps/server && pnpm dev` — server only (ts-node --watch)
- `cd apps/web && pnpm dev` — web only (Vite dev server)

## Code Standards
- TypeScript strict mode, 4-space indent
- React functional components with hooks
- Zustand for state management (playerStore.ts)
- CSS in styles/global.css — dark theme, glassmorphism style
- Conventional Commits (feat:, fix:, docs:, chore:, refactor:)
- Branch model: main (stable) / develop / feat/* / fix/*

## Project Structure
- apps/server/src/routes/ — API route handlers
- apps/server/src/services/ — business logic (ncm, claude, tts, weather, etc.)
- apps/server/src/db/ — SQLite repos (settings, playlist, plays)
- apps/server/src/helpers/ — utilities (plan-enrich)
- apps/web/src/pages/ — route pages (Player, Playlist, Profile, Settings)
- apps/web/src/components/ — UI components
- apps/web/src/stores/ — Zustand stores
- apps/web/src/audio/ — AudioPlayer manager (HTMLAudioElement wrapper)
- apps/web/src/api/ — API client + WebSocket client

## Current Features
- AI-powered music planning (Claude generates playlists based on context)
- NCM song search and playback with real audio streaming
- DJ TTS messages between songs (DjMessages + ChatArea)
- LRC/karaoke lyrics display (KaraokeLyrics + LyricsPanel)
- 6 audio visualization modes (AudioVisualizer + AudioSpectrum)
- Playlist CRUD + NCM playlist browsing
- Play history tracking with real DB stats
- Song favorite/like system
- Volume control, shuffle/repeat modes
- Keyboard shortcuts + MediaSession API (lock screen/earphone controls)
- Toast notification system + loading skeletons
- MiniPlayer bottom bar
- Bilingual (EN/ZH) i18n
- PWA with service worker
- Profile page with real play stats (top artists, minutes listened, favorites)

## Known Gaps (to fix)
- /api/now and /api/player use mock queue (Task 1 in progress)
- WebSocket events not fully wired (Task 2 in progress)
- Scheduler cron tasks are stubs (Task 2 in progress)
- No drag-to-reorder queue
- No UPnP casting
