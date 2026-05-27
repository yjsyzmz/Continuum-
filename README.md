<h1 align="center">Continuum</h1>

<p align="center">
  <em>Pick up where Claude left off.</em><br>
  <em>从 Claude 停下的地方，继续走。</em>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-blue" alt="Chrome Web Store coming soon" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" /></a>
  <a href="https://claude.ai"><img src="https://img.shields.io/badge/Claude.ai-supported-purple" alt="Claude.ai supported" /></a>
</p>

---

## What Is This?

**Continuum** is a Chrome extension that quietly protects your long-running Claude.ai tasks from quota limits.

It runs in the background, captures what Claude streams to your browser, and, when your 5-hour window or weekly limit hits, gives you a one-click handoff prompt you can paste into a new chat, a new account, or even another AI tool. Your work continues from where it broke. No re-explaining, no scrolling through dead conversations, no starting over.

**Continuum** 是一个 Chrome 扩展，专门解决 Claude.ai 长任务被 quota 中断后“前面两小时白干”的问题。

它在后台静默运行，捕获 Claude 流式输出的内容，在 5 小时窗口或周限额撞墙的那一刻，一键生成可粘贴的接力 prompt。你可以把它粘到新对话、新账号，甚至别的 AI 工具里，让任务从断点继续。不用重新解释，不用翻历史，不用从零开始。

## Why It Exists

If you use Claude Pro for real work, such as writing, coding, research, or batch tasks, you have probably hit this wall:

- You are 90% through a long task when quota cuts you off.
- The resume workflow means re-uploading context, re-explaining the goal, and hoping the new chat picks up the thread.
- Existing approaches, like manual summaries or handoff templates, require you to remember to use them before things break.

Continuum flips this. It assumes things will break, and makes sure your work survives when they do, so you can always pick up where Claude left off.

如果你用 Claude Pro 做真活，比如写作、编程、研究、批量任务，你一定撞过这堵墙：

- 长任务做到 90% 被 quota 截断。
- 想恢复就得重新上传上下文、重新解释目标，祈祷新对话能接上原来的脉络。
- 现有方案，比如摘要插件或手动 handoff 模板，都要求你在崩之前就想起来用它。

Continuum 反过来：它默认事情一定会崩，确保崩的时候你的活还在，让你永远可以从 Claude 停下的地方继续走。

## What It Does

- **Captures silently**: records visible Claude output already streamed to your browser.
- **Generates handoffs**: turns a long task into a resumable prompt with one click.
- **Stays local**: stores task data in the browser extension's IndexedDB.
- **Uses no extra Claude tokens**: does not call Claude on your behalf to summarize or recover.
- **Stays out of the way**: quiet by default, present when it matters.

## Current Status

Continuum is in early MVP development. The current validated P0 flow supports:

- Claude.ai visible output capture through a main-world fetch/SSE hook.
- DOM visible-text fallback when the live endpoint shape changes.
- Local task and recording storage with Dexie/IndexedDB.
- One Claude conversation mapped to one local task.
- Local handoff prompt generation without calling Claude API.
- Copy handoff text and open a new Claude chat.
- Toolbar popup and simple task management page.

Quota runway UI, risk badges, cloud sync, and AI-generated handoff summaries are part of the product direction, but they are not required for the current P0 demo.

## Install Locally

```bash
pnpm install
pnpm build
```

Then load the unpacked extension from:

```text
.output/chrome-mv3
```

In Chrome or Edge:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `.output/chrome-mv3`.
5. Open `https://claude.ai/new` and start a Claude task.

## Development

```bash
pnpm dev
```

For full local verification:

```bash
pnpm check
```

For a distributable Chrome zip:

```bash
pnpm zip
```

## Project Structure

```text
entrypoints/
  background.ts       MV3 service worker and capture message router
  content.ts          Claude page bridge, inject loader, DOM fallback
  inject.ts           Main-world fetch/SSE capture script
  popup/              Toolbar popup
  task-list/          Task management page
src/
  capture/            Claude endpoint heuristics, SSE parser, DOM capture
  storage/            Dexie database and repositories
  core/task/          Capture event to task/recording orchestration
  core/handoff/       Local handoff generator and task classifier
  core/recovery/      Copy handoff and open new Claude chat
  shared/types/       Cross-context types
  ui/                 Shared UI helpers
docs/                 Store listing draft, spike notes, manual test checklist
tests/                Vitest unit tests
```

## Privacy Model

All captured task data stays in the browser extension's IndexedDB. Continuum does not upload conversation content, does not require a Continuum account, does not send telemetry, and does not attempt to access hidden Claude reasoning or thinking.

## Real Claude.ai Validation

See `docs/spike-claude-ai.md`, `docs/demo-test-report.md`, and `docs/manual-test-checklist.md`. Claude.ai endpoint shapes can change, so the SSE parser is isolated and the extension includes a DOM fallback.

## Store Listing Draft

Chrome Web Store copy lives in `docs/store-listing.md`. The public listing URL is intentionally left as a placeholder until the extension is submitted.

## License

MIT. See `LICENSE`.
