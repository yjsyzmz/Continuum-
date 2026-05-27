import {
  extractConversationId,
  extractTextDelta,
  extractUserPrompt,
  isClaudeCompletionEndpoint,
} from '@/src/capture/claude';
import { appendSSEChunk } from '@/src/capture/sse-parser';
import type { CaptureEnvelope } from '@/src/shared/types/capture';

export default defineUnlistedScript(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const url = getFetchUrl(input);

    if (!url || !isClaudeCompletionEndpoint(url)) {
      return originalFetch(...args);
    }

    const response = await originalFetch(...args);
    const cloned = response.clone();

    void parseCompletionStream(cloned, {
      requestBody: init?.body,
      url,
    });

    return response;
  };
});

async function parseCompletionStream(
  response: Response,
  meta: { requestBody: unknown; url: string },
): Promise<void> {
  if (!response.body) return;

  const requestId = createRequestId();
  let started = false;

  const ensureStarted = () => {
    if (started) return;
    started = true;
    postToContent({
      source: 'claude-task-safety',
      type: 'CAPTURE_START',
      payload: {
        requestId,
        conversationId: extractConversationId(meta.url),
        userPrompt: extractUserPrompt(meta.requestBody),
        startedAt: Date.now(),
        captureMethod: 'sse',
        url: meta.url,
      },
    });
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remainder = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      remainder += decoder.decode(value, { stream: true });
      const result = appendSSEChunk('', remainder);
      remainder = result.remainder;

      for (const event of result.parsed) {
        const textDelta = extractTextDelta(event);
        if (!textDelta) continue;

        ensureStarted();
        postToContent({
          source: 'claude-task-safety',
          type: 'CAPTURE_DELTA',
          payload: {
            requestId,
            textDelta,
            event,
          },
        });
      }
    }

    if (!started) return;
    postToContent({
      source: 'claude-task-safety',
      type: 'CAPTURE_END',
      payload: {
        requestId,
        completedAt: Date.now(),
      },
    });
  } catch {
    if (!started) return;
    postToContent({
      source: 'claude-task-safety',
      type: 'CAPTURE_INTERRUPTED',
      payload: {
        requestId,
        reason: 'network',
        completedAt: Date.now(),
      },
    });
  }
}

function getFetchUrl(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if ('url' in input) return input.url;
  return null;
}

function postToContent(message: CaptureEnvelope): void {
  window.postMessage(
    {
      source: 'claude-task-safety-inject',
      payload: message,
    },
    window.location.origin,
  );
}

function createRequestId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `sse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
