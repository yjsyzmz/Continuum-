# Claude.ai Technical Spike Notes

This demo ships with two capture paths:

- Primary: inject a main-world script and hook `window.fetch` for Claude completion streams.
- Fallback: observe visible assistant text in the Claude page DOM when no injected SSE activity is detected.

## Current Demo Status

- The implementation uses endpoint heuristics for `https://claude.ai/*` API calls whose path contains `/api/` plus one of `/completion`, `/chat_conversations/`, or `/messages`.
- SSE parsing only persists visible text deltas. It does not store hidden reasoning, internal thinking, or raw event logs by default.
- The `/usage` endpoint is intentionally not implemented in P0. The `usageSnapshots` table exists so quota monitoring can be added without changing the storage schema shape.

## Manual Spike Checklist

- [ ] Open Claude.ai with the unpacked extension installed.
- [ ] Send a normal text prompt and confirm a task appears in the task list.
- [ ] Send a long prompt and confirm the recording grows while the answer streams.
- [ ] Generate code or an artifact and confirm visible text/code is captured.
- [ ] Disable network during generation and confirm the task becomes interrupted.
- [ ] Inspect the service worker console for endpoint mismatch logs if no SSE capture appears.
- [ ] Confirm DOM fallback still creates a usable recording when SSE matching is unavailable.

## Follow-up Fields To Fill After Real Testing

| Finding | Result |
|---|---|
| Actual completion endpoint | `https://claude.ai/api/organizations/{orgId}/chat_conversations/{conversationId}/completion` |
| Actual conversation id source | URL path segment after `/chat_conversations/`; the visible page navigates to `https://claude.ai/chat/{conversationId}` after send |
| SSE event names seen | Text capture confirmed through `content_block_delta` / `text_delta`; stop/metadata events can also appear without visible text |
| Artifact/code stream shape | TBD |
| Usage endpoint availability | Deferred |

## 2026-05-27 Real Account Notes

- The extension was loaded into an already logged-in Edge Dev session through the CDP `Extensions.loadUnpacked` command; no new browser window was opened.
- A real Claude message was sent from `https://claude.ai/new`.
- IndexedDB recorded one task mapped to the real conversation id and a completed recording with `captureMethod: sse`.
- A secondary no-visible-text SSE request was observed during the same turn. The demo now lazily starts SSE recordings only after the first visible text delta and clears completed empty recordings defensively.
