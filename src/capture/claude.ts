import type { SSEEvent } from '@/src/shared/types/capture';

const COMPLETION_ENDPOINT_HINTS = [
  '/completion',
  '/chat_conversations/',
  '/messages',
];

export function isClaudeCompletionEndpoint(
  inputUrl: string,
  baseUrl = globalThis.location?.href,
): boolean {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (!url.hostname.endsWith('claude.ai')) return false;
    const path = url.pathname;

    return (
      path.includes('/api/') &&
      COMPLETION_ENDPOINT_HINTS.some((hint) => path.includes(hint))
    );
  } catch {
    return false;
  }
}

export function extractConversationId(
  inputUrl?: string | null,
  pageUrl = globalThis.location?.href,
): string | null {
  const candidates = [inputUrl, pageUrl].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, pageUrl);
      const match =
        url.pathname.match(/chat_conversations\/([^/]+)/) ??
        url.pathname.match(/\/chat\/([^/?#]+)/) ??
        url.pathname.match(/\/conversation\/([^/?#]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    } catch {
      const match = candidate.match(/chat_conversations\/([^/]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
  }

  return null;
}

export function extractUserPrompt(body: unknown): string | null {
  const parsed = parseBody(body);
  if (!parsed) return null;

  const fromMessages = findLatestUserMessage(parsed);
  if (fromMessages) return normalizePrompt(fromMessages);

  const direct = findPromptLikeText(parsed);
  return direct ? normalizePrompt(direct) : null;
}

export function extractTextDelta(event: SSEEvent): string | null {
  const data = event.data as {
    delta?: { type?: string; text?: unknown };
    content_block?: { type?: string; text?: unknown };
  };

  if (event.type === 'content_block_delta') {
    const delta = data?.delta;
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
      return delta.text;
    }
  }

  if (
    data?.content_block?.type === 'text' &&
    typeof data.content_block.text === 'string'
  ) {
    return data.content_block.text;
  }

  return null;
}

export function isStopEvent(event: SSEEvent): boolean {
  return event.type === 'message_stop' || event.type === 'content_block_stop';
}

function parseBody(body: unknown): unknown {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }
  if (body instanceof FormData) {
    return Object.fromEntries(body.entries());
  }
  return body;
}

function findLatestUserMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;

  for (const message of [...messages].reverse()) {
    if (!message || typeof message !== 'object') continue;
    const role = (message as { role?: unknown }).role;
    if (role !== 'user' && role !== 'human') continue;
    const text = findPromptLikeText(message);
    if (text) return text;
  }

  return null;
}

function findPromptLikeText(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of [...value].reverse()) {
      const found = findPromptLikeText(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['prompt', 'text', 'content', 'message']) {
    const found = findPromptLikeText(record[key], depth + 1);
    if (found) return found;
  }

  return null;
}

function normalizePrompt(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

