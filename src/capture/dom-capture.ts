import type { CaptureEnvelope } from '@/src/shared/types/capture';
import { extractConversationId } from './claude';

interface DomCaptureOptions {
  onCapture: (message: CaptureEnvelope) => void;
  getLastInjectSeenAt: () => number;
  idleMs?: number;
}

interface ActiveDomRecording {
  requestId: string;
  text: string;
  lastChangedAt: number;
}

export interface DomCaptureController {
  stop: () => void;
}

export function startClaudeDomCapture(
  options: DomCaptureOptions,
): DomCaptureController {
  const idleMs = options.idleMs ?? 4500;
  let active: ActiveDomRecording | null = null;
  let lastCompletedText = '';

  const scan = () => {
    if (Date.now() - options.getLastInjectSeenAt() < 3000) return;

    const text = extractLatestAssistantText(document);
    if (!text || text.length < 20 || text === lastCompletedText) return;

    if (!active || !text.startsWith(active.text)) {
      finishActive();
      active = {
        requestId: createDomRequestId(),
        text: '',
        lastChangedAt: Date.now(),
      };
      options.onCapture({
        source: 'claude-task-safety',
        type: 'CAPTURE_START',
        payload: {
          requestId: active.requestId,
          conversationId: extractConversationId(null),
          userPrompt: extractLatestUserText(document),
          startedAt: Date.now(),
          captureMethod: 'dom',
          url: location.href,
        },
      });
    }

    if (text.length > active.text.length) {
      const textDelta = text.slice(active.text.length);
      active.text = text;
      active.lastChangedAt = Date.now();
      options.onCapture({
        source: 'claude-task-safety',
        type: 'CAPTURE_DELTA',
        payload: {
          requestId: active.requestId,
          textDelta,
          accumulatedText: active.text,
        },
      });
    }
  };

  const finishActive = () => {
    if (!active) return;
    lastCompletedText = active.text;
    options.onCapture({
      source: 'claude-task-safety',
      type: 'CAPTURE_END',
      payload: {
        requestId: active.requestId,
        completedAt: Date.now(),
      },
    });
    active = null;
  };

  const observer = new MutationObserver(scan);
  const startObserver = () => {
    const root = document.querySelector('main') ?? document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    scan();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  const settleTimer = window.setInterval(() => {
    if (active && Date.now() - active.lastChangedAt > idleMs) {
      finishActive();
    }
  }, 1000);

  return {
    stop() {
      observer.disconnect();
      window.clearInterval(settleTimer);
      finishActive();
    },
  };
}

export function extractLatestAssistantText(root: ParentNode): string | null {
  const selectors = [
    '[data-testid*="assistant"]',
    '[data-is-streaming="true"]',
    '.font-claude-message',
    'article',
    '[data-testid="conversation-turn"]',
  ];

  for (const selector of selectors) {
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(selector))
      .map((element) => cleanVisibleText(element.innerText))
      .filter((text) => text.length > 20);
    const latest = candidates.at(-1);
    if (latest) return latest;
  }

  return null;
}

function extractLatestUserText(root: ParentNode): string | null {
  const selectors = [
    '[data-testid*="user"]',
    '[data-testid*="human"]',
    'textarea',
  ];

  for (const selector of selectors) {
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(selector))
      .map((element) => cleanVisibleText(element.innerText || element.textContent))
      .filter(Boolean);
    const latest = candidates.at(-1);
    if (latest) return latest;
  }

  return null;
}

function cleanVisibleText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function createDomRequestId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `dom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

