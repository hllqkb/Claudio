# Claudio - AI 音乐电台

> 把多年歌单蒸馏成一个会看场景、会说话、会选歌的个人 AI 电台。

Claudio 是一个本地化的 AI 音乐电台系统。导入网易云歌单后，Claude AI 根据你的口味、天气、日程和实时指令生成播放计划与 DJ 串词，再通过 TTS 合成语音播报，带来沉浸式电台体验。

## 特性

- **个性化推荐** — 基于歌单、口味规则、情绪规则和播放历史生成推荐
- **场景感知** — 结合天气、日历、时间段动态调整音乐和播报
- **AI DJ 串词** — Claude 自动生成主持词、天气提醒、日程提示、音乐介绍
- **自然语言控制** — 输入"来点适合写代码的歌"即可调整播放风格
- **网易云音乐** — 搜索、播放、歌词获取、UnblockNeteaseMusic 灰色歌曲解锁
- **PWA 播放器** — 响应式前端，支持桌面和移动端
- **UPnP 投放** — 推送到家庭音响或局域网播放设备
- **私有化部署** — 核心服务运行在本地，用户数据本地保存

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + Zustand + PWA |
| 后端 | Fastify + TypeScript + WebSocket |
| 数据库 | SQLite (better-sqlite3) |
| AI 编排 | Anthropic Claude API |
| 音乐源 | 网易云音乐 + UnblockNeteaseMusic |
| TTS | Fish Audio / Edge TTS |
| 包管理 | pnpm workspace (monorepo) |

## 项目结构

```
Claudio/
├── apps/
│   ├── server/              # 后端服务
│   │   ├── src/
│   │   │   ├── routes/      # API 路由 (now, plan, player, intent, stream, media, settings, profile)
│   │   │   ├── services/    # 业务服务 (claude, ncm, tts, weather, calendar, upnp, scheduler, context)
│   │   │   ├── db/          # 数据库层
│   │   │   ├── prompts/     # Claude system prompt
│   │   │   └── config.ts    # 配置加载
│   │   └── package.json
│   └── web/                 # 前端 PWA
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── pages/       # 页面 (Player, Profile, Settings)
│       │   ├── stores/      # Zustand 状态管理
│       │   ├── api/         # API 客户端
│       │   └── audio/       # 音频播放器
│       └── package.json
├── user/                    # 用户画像 (taste, routines, mood-rules)
├── package.json             # 根配置
├── pnpm-workspace.yaml      # pnpm 工作区
└── DEVELOPMENT_SPEC_AI_RADIO.md  # 开发规范文档
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- 网易云音乐账号（可选）
- Anthropic API Key
- Fish Audio API Key（TTS）

### 安装

```bash
git clone https://github.com/hllqkb/Claudio.git
cd Claudio
pnpm install
```

### 配置

```bash
cd apps/server
cp .env.example .env   # 如果没有 .env.example，手动创建
```

编辑 `.env` 填入以下配置：

```env
ANTHROPIC_API_KEY=your_claude_api_key
FISH_AUDIO_API_KEY=your_tts_key
NCM_PHONE=your_phone        # 网易云手机号（可选）
NCM_PASSWORD=your_password   # 网易云密码（可选）
PORT=8080
```

### 开发

```bash
# 同时启动前端和后端
pnpm dev

# 单独启动后端
pnpm --filter @ai-radio/server dev

# 单独启动前端
pnpm --filter @ai-radio/web dev
```

- 后端：http://localhost:8080
- 前端：http://localhost:5173

### 构建

```bash
pnpm build
```

## 使用方式

1. 打开 PWA 播放器
2. 在设置页配置 API Key 和网易云信息
3. 输入自然语言指令，如"来点轻松的爵士乐"
4. 或等待系统根据时间、天气自动生成播放计划

## 开发规范

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Type 类型：**

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（既非新功能也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖变更 |
| `ci` | CI 配置变更 |

**Scope 范围：**

`server`, `web`, `db`, `config`, `deps`

**示例：**

```
feat(server): 添加 UPnP 设备发现与推送播放
fix(web): 修复播放队列拖拽排序失效的问题
docs: 更新 README 安装说明
refactor(server): 拆分 claude.service 为独立模块
chore(deps): 升级 fastify 到 v5.3
```

### 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定版本，保护分支 |
| `develop` | 开发主线 |
| `feat/*` | 功能分支，如 `feat/upnp-cast` |
| `fix/*` | 修复分支，如 `fix/queue-reorder` |
| `docs/*` | 文档分支 |

### PR 规范

1. 从 `develop` 创建功能分支
2. 开发完成后提交 PR 到 `develop`
3. PR 标题遵循 Commit 规范格式
4. 描述中说明改动内容和测试方式
5. 至少一个 reviewer 通过后合并

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/my-feature`
3. 提交改动：`git commit -m 'feat(server): 添加某功能'`
4. 推送分支：`git push origin feat/my-feature`
5. 创建 Pull Request

### 开发环境设置

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm lint

# 构建验证
pnpm build
```

### 代码风格

- TypeScript 严格模式
- 4 空格缩进
- 使用 ESLint + Prettier（项目已有配置）
- 提交前确保 `pnpm lint` 通过

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

## 致谢

- [Anthropic Claude](https://www.anthropic.com/) — AI 编排引擎
- [网易云音乐](https://music.163.com/) — 音乐数据源
- [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server) — 灰色歌曲解锁
- [Fish Audio](https://fish.audio/) — TTS 语音合成
