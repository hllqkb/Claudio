# AI 音乐电台交付给 Claude Code 的入口说明

## 阅读顺序

1. 先读 `PRODUCT_SPEC_AI_RADIO.md`，理解产品目标、用户场景和 MVP 范围。
2. 再读 `DEVELOPMENT_SPEC_AI_RADIO.md`，按阶段实现工程。

## 你要实现的产品

一个本地优先的 AI 音乐电台：

- PWA 播放器负责播放、队列、Profile、Settings。
- Node.js 本地服务器负责统一调度。
- Claude 负责根据用户口味、时间、天气、日历、播放历史生成播放计划和 DJ 串词。
- 网易云音乐负责歌曲搜索、播放 URL、歌词和推荐。
- Fish Audio 负责把 DJ 串词合成为 MP3。
- 可选接入飞书日历、OpenWeather 和 UPnP。

## 第一轮实现目标

请先完成 MVP 骨架，不要一开始就追求所有外部 API 完整可用。

必须完成：

- pnpm monorepo。
- `apps/web`：Vite + React + TypeScript PWA。
- `apps/server`：Node.js + TypeScript + Fastify。
- `/api/health`。
- `/api/now`。
- `/api/plan` 的 mock 版本。
- 播放器页面能播放 mock 队列。
- Settings 页面能保存配置，敏感 key 脱敏显示。
- 后端 service 层预留 Claude、网易云、Fish Audio、天气、日历、UPnP。

## 关键约束

- 不允许 Claude 或任何 LLM 直接执行 shell。
- 所有外部能力必须封装为 service，并做 timeout、错误处理和 fallback。
- 没有 API Key 时使用 mock provider，保证主流程可演示。
- API Key 不允许明文返回前端。
- TTS 失败不能阻断歌曲播放。
- 歌曲 URL 获取失败要自动跳过或换源。

## 可直接使用的 Claude Code 提示词

```text
请根据当前目录的 PRODUCT_SPEC_AI_RADIO.md、DEVELOPMENT_SPEC_AI_RADIO.md、HANDOFF_TO_CC.md 实现 AI 音乐电台 MVP。

按 DEVELOPMENT_SPEC_AI_RADIO.md 的阶段推进。先搭建工程骨架，再实现播放器、队列、mock plan 和 settings。外部 API 先做 service interface + mock provider，真实 provider 留好配置入口。

每完成一个阶段，请运行可用的检查命令，并说明：
1. 改了哪些文件；
2. 当前能演示什么；
3. 下一阶段要做什么；
4. 还有哪些 API Key 或本地服务需要用户配置。
```

