<div align="center">

<img src="docs/images/screenshot-player.png" width="900" alt="Claudio AI Radio">

# 🎧 Claudio — AI Music Radio

**你的私人 AI 音乐电台 · 看场景选歌 · 会说话的 DJ · 封面色随动**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=googlechrome&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

把多年歌单蒸馏成一个会看场景、会说话、会选歌的个人 AI 电台。

Claudio 通过 Claude AI 根据你的口味、天气、时段和实时指令生成播放计划与 DJ 串词，再经 Fish Audio 合成语音播报，带来沉浸式电台体验。

</div>

---

## ✨ Features

<div align="center">

| | Feature | Description |
|:---:|:---|:---|
| 🤖 | **AI DJ 串词** | Claude 自动生成主持词、天气提醒、音乐介绍，TTS 语音播报 |
| 🎯 | **场景感知** | 结合天气、时段、日程动态调整音乐风格和推荐 |
| 💬 | **自然语言点歌** | 输入「来点适合写代码的歌」即可调整播放风格 |
| 🎶 | **网易云音乐** | 搜索、播放、逐字歌词、歌单管理、收藏、灰色歌曲解锁 |
| 🎨 | **6 种音频可视化** | Glob / Flower / Arcs / Circles / Wave / Shine |
| 📊 | **封面色频谱** | 频谱颜色跟随封面主题色实时变化，3-stop 渐变 |
| 🖱️ | **鼠标跟随光效** | Cursor Glow 随封面主色变化的光晕跟随鼠标移动 |
| 🎤 | **逐字歌词** | 网易云风格渐变扫描效果，rAF 驱动，零卡顿 |
| 🌙 | **深色/浅色主题** | 一键切换，全面适配 |
| 📱 | **PWA 支持** | 安装到桌面/手机，MediaSession 锁屏控制 |
| 🔒 | **本地私有化** | 核心服务运行在本地，数据全部本地保存 |

</div>

---

## 📸 Screenshots

<div align="center">

### 🎧 播放器 — 深色主题

<img src="docs/images/screenshot-player.png" width="800" alt="Player - Dark Theme">

*封面旋转 · 逐字歌词 · 实时频谱 · 封面色跟随*

</div>

<div align="center">

### 🤖 AI 对话 — 歌曲推荐

<img src="docs/images/screenshot-ai-chat.png" width="800" alt="AI Chat Sidebar">

*自然语言点歌 · 歌曲卡片 · DJ 串词 · 一键播放*

</div>

<div align="center">

### 🌅 浅色主题 & ⚙️ 设置页面

<img src="docs/images/screenshot-light-theme.png" width="49%" alt="Light Theme">
<img src="docs/images/screenshot-settings.png" width="49%" alt="Settings">

</div>

<div align="center">

### 📋 歌单 · 历史 · 个人品味

<img src="docs/images/screenshot-ncm-playlist.png" width="32%" alt="Playlist">
<img src="docs/images/screenshot-history.png" width="32%" alt="History">
<img src="docs/images/screenshot-profile.png" width="32%" alt="Profile">

</div>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Frontend (React 19 + Vite)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ Player   │ │ Playlist │ │ Profile  │ │   Settings       ││
│  │ Page     │ │ Page     │ │ Page     │ │   Page           ││
│  └────┬─────┘ └──────────┘ └──────────┘ └──────────────────┘│
│       │  Zustand Store · WebSocket · AudioPlayer             │
│       │  KaraokeLyrics · SpectrumBars · CursorGlow            │
│       │  AudioVisualizer (6 modes) · FluidBlobs · Particles   │
└───────┼──────────────────────────────────────────────────────┘
        │ HTTP + WebSocket
┌───────┴──────────────────────────────────────────────────────┐
│                  Backend (Fastify + TypeScript)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Claude   │ │ NCM      │ │ Fish     │ │ Weather  │        │
│  │ AI Plan  │ │ Music    │ │ Audio    │ │ Service  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│           SQLite (better-sqlite3) · TTS · Scheduler          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9
- **网易云音乐** 账号（Cookie）

### 安装 & 启动

```bash
# 克隆仓库
git clone https://github.com/hllqkb/Claudio.git
cd Claudio

# 安装依赖
pnpm install

# 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env，填入 API Key 等配置

# 一键启动 🎵
./start.sh
```

启动后访问:

| 服务 | 地址 |
|:---|:---|
| **前端** | http://localhost:5173 |
| **后端** | http://localhost:8080 |
| **NCM 代理** | http://localhost:3000 |

### 环境变量

| 变量 | 说明 | 必填 |
|:---|:---|:---:|
| `ANTHROPIC_API_KEY` | Claude AI API Key | ✅ |
| `ANTHROPIC_BASE_URL` | Claude API Base URL | ✅ |
| `FISH_AUDIO_API_KEY` | Fish Audio TTS API Key | ✅ |
| `FISH_AUDIO_VOICE_ID` | TTS 语音音色 ID | ✅ |
| `NETEASE_COOKIE` | 网易云音乐 Cookie | ✅ |
| `WEATHER_API_KEY` | OpenWeather API Key | ❌ |
| `CITY` | 天气城市（默认 Shanghai） | ❌ |

---

## 📁 Project Structure

```
Claudio/
├── apps/
│   ├── server/                    # Fastify 后端
│   │   ├── src/
│   │   │   ├── routes/            # API 路由 (dispatch, audio, playlist, profile...)
│   │   │   ├── services/          # 业务逻辑
│   │   │   │   ├── claude.service.ts    # AI 规划 + DJ 串词
│   │   │   │   ├── ncm.service.ts       # 网易云音乐 API
│   │   │   │   ├── fish-audio.service.ts # TTS 语音合成
│   │   │   │   ├── weather.service.ts    # 天气服务
│   │   │   │   └── context.service.ts    # 用户画像 + 场景上下文
│   │   │   ├── db/                # SQLite 数据仓库
│   │   │   └── index.ts           # 入口
│   │   └── .env                   # 环境变量
│   └── web/                       # React 前端
│       ├── src/
│       │   ├── pages/             # 页面
│       │   │   ├── PlayerPage.tsx       # 主播放器
│       │   │   ├── PlaylistPage.tsx     # 歌单 (收藏 + 网易云)
│       │   │   ├── ProfilePage.tsx      # 个人品味 (统计 + 偏好编辑)
│       │   │   ├── SettingsPage.tsx     # 设置 (服务分组卡片)
│       │   │   └── HistoryPage.tsx      # 播放历史
│       │   ├── components/        # UI 组件
│       │   │   ├── KaraokeLyrics.tsx    # 逐字歌词 (渐变扫描)
│       │   │   ├── SpectrumBars.tsx     # 封面色频谱分析
│       │   │   ├── AudioVisualizer.tsx  # 6 种音频可视化
│       │   │   ├── CursorGlow.tsx       # 鼠标跟随光效
│       │   │   ├── FluidBlobs.tsx       # 流体背景
│       │   │   ├── ParticleCanvas.tsx   # 粒子特效
│       │   │   ├── ChatArea.tsx         # AI 对话
│       │   │   └── SongCard.tsx         # 歌曲卡片
│       │   ├── stores/            # Zustand 状态管理
│       │   ├── audio/             # AudioPlayer 引擎
│       │   ├── api/               # API 客户端 + WebSocket
│       │   ├── utils/             # 工具 (colorExtractor, voiceSynth)
│       │   ├── i18n/              # 国际化 (中/英)
│       │   └── styles/            # 全局 CSS (5000+ 行)
│       └── vite.config.ts
├── start.sh                       # 一键启动脚本
├── CLAUDE.md                      # Claude Code 项目规范
└── pnpm-workspace.yaml
```

---

## 🎨 Design System

| Token | Dark | Light |
|:---|:---|:---|
| Primary | `#5ee8c5` | `#0d9488` |
| Background | `#0a0a0f` | `#f8f9fa` |
| Card | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.02)` |
| Text Primary | `#e2e8f0` | `#1a1a2e` |
| Text Secondary | `#94a3b8` | `#64748b` |
| Border | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |

> **动态主题色**: 每首歌切换时，`extractColors` 从封面提取 3 色 (primary/secondary/accent)，
> 自动更新 `--color-primary` 等 CSS 变量，频谱、光效、背景全部跟随变化。

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 19 · Vite · Zustand · PWA · TypeScript |
| **Backend** | Fastify · WebSocket · TypeScript |
| **Database** | SQLite (better-sqlite3) |
| **AI** | Anthropic Claude API |
| **Music** | 网易云音乐 + UnblockNeteaseMusic |
| **TTS** | Fish Audio / Edge TTS |
| **Package** | pnpm workspace (monorepo) |

---

## 📖 Key Concepts

### 🎤 Karaoke Lyrics
逐字歌词使用 `background-clip: text` + CSS `--progress` 变量实现网易云风格渐变扫描效果。rAF 驱动的直接 DOM 更新确保零 React 重渲染，丝滑不卡顿。

### 📊 Cover-Color Spectrum
实时频谱分析采用对数频率映射，中间 = 低频 bass，外侧 = 高频 treble。
每 0.5s 从封面提取的 `--color-primary/secondary/accent` 读取颜色，3-stop 渐变渲染每根 bar。
快速上升 (attack 0.9) + 快速下降 (release 0.15) 确保频谱紧贴音乐节拍。

### 🖱️ Cursor Glow
鼠标光效使用 300px 径向模糊 + `mix-blend-mode: screen`，颜色跟随封面主色，
lerp 平滑跟随 (0.12 系数)，不遮挡内容。

### 🤖 AI Planning
Claude AI 根据当前场景（天气/时段/用户偏好）生成播放计划，自动插入 DJ 串词，通过 Fish Audio 合成自然语音播报。

### 🎨 Color Extraction
封面图片通过 Canvas + K-Means (k=3) 聚类提取主色调，`boostSaturation` 确保提取色足够鲜艳。
自动设置 `--color-primary/secondary/accent` CSS 变量，全组件响应式跟随。

---

## 🤝 Contributing

```bash
# 开发模式启动
pnpm dev

# 构建
pnpm --filter @ai-radio/web build
pnpm --filter @ai-radio/server build

# 代码规范
# - TypeScript strict mode
# - 4-space indent
# - Conventional Commits (feat:, fix:, docs:, chore:)
```

---

## 📄 License

MIT © [hllqkb](https://github.com/hllqkb)

---

<div align="center">

**Made with ❤️ and AI**

[GitHub](https://github.com/hllqkb/Claudio) · [Report Bug](https://github.com/hllqkb/Claudio/issues) · [Request Feature](https://github.com/hllqkb/Claudio/issues)

</div>
