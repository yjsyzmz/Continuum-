# Claude Task Safety

Local-first Chrome MV3 extension demo for protecting long Claude.ai tasks. It records visible assistant output, stores task state in IndexedDB, and generates a handoff prompt that can be pasted into a new Claude chat.

## P0 Scope

- Capture visible Claude.ai output with a main-world fetch/SSE hook.
- Fall back to DOM visible-text capture when the live endpoint shape is not matched.
- Store tasks and recordings locally with Dexie/IndexedDB.
- Map one Claude conversation to one local task.
- Generate a local handoff prompt without calling Claude API.
- Copy handoff text and open a new Claude chat.
- Provide a popup and a simple task management page.

Quota monitoring, risk badges, input-box status bars, cloud sync, and AI-generated summaries are intentionally outside P0.

## Structure

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
docs/                 Spike notes and manual test checklist
tests/                Vitest unit tests
```

## Setup

```bash
pnpm install
pnpm test
pnpm build
```

Load the unpacked extension from:

```text
.output/chrome-mv3
```

## Development

```bash
pnpm dev
```

For a production build:

```bash
pnpm build
```

For full local verification:

```bash
pnpm check
```

## Privacy Model

All captured task data stays in the browser extension's IndexedDB. The demo does not upload conversation content, does not call Claude API to summarize handoffs, and does not attempt to access hidden Claude reasoning or thinking.

## Real Claude.ai Validation

See `docs/spike-claude-ai.md` and `docs/manual-test-checklist.md`. Claude.ai endpoint shapes can change, so P0 keeps the SSE parser isolated and includes a DOM fallback.
