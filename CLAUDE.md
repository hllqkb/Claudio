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
- DJ TTS messages between songs
- LRC/karaoke lyrics display
- 6 audio visualization modes
- Playlist CRUD
- NCM playlist browsing
- Play history tracking
- Bilingual (EN/ZH) i18n
- PWA with service worker

## Known Gaps (to fix)
- No volume control UI (AudioPlayer.setVolume exists but no slider)
- No shuffle/repeat modes
- No song search from frontend
- No keyboard/media key shortcuts
- No toast notification system
- No loading skeletons
- MiniPlayer exists but not wired into layout
- No drag-to-reorder queue
- No song like/favorite system
- No recently played history page
