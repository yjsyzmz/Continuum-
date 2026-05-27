# Manual Test Checklist

## Install

- [ ] Run `pnpm build`.
- [ ] Open Chrome `chrome://extensions`.
- [ ] Enable Developer mode.
- [ ] Load unpacked extension from `.output/chrome-mv3`.

## P0 Flow

- [ ] Open `https://claude.ai/new`.
- [ ] Prefer using one useful question from `D:\下载\AI产品经理面试题库_个性化回答集.md` instead of throwaway prompts.
- [ ] Send one or more normal messages in the same conversation.
- [ ] Open the extension popup and click `任务列表`.
- [ ] Confirm one task appears with `messageCount` increasing.
- [ ] Click `预览 Handoff` and confirm the handoff contains the original goal, recent turns, last output, and next step.
- [ ] Click `复制接力 Prompt` and paste into a text editor to confirm clipboard content.
- [ ] Click `复制并打开新 Chat` and confirm a new Claude tab opens.

## Interruption Flow

- [ ] Start a long Claude response.
- [ ] Turn off network or stop the response mid-generation.
- [ ] Confirm the task status changes to `已中断`.
- [ ] Generate the handoff and confirm it marks the last output as possibly incomplete.

## Degraded Capture

- [ ] If fetch/SSE capture does not match the live Claude endpoint, confirm DOM fallback still records visible assistant text.
- [ ] Confirm no hidden reasoning/thinking text is shown in handoff output.
