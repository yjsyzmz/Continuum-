import type { SSEEvent } from '@/src/shared/types/capture';

export interface SSEParseResult {
  parsed: SSEEvent[];
  remainder: string;
}

export function splitSSEEvents(buffer: string): SSEParseResult {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const remainder = parts.pop() ?? '';
  const parsed: SSEEvent[] = [];

  for (const part of parts) {
    const event = parseSSEEvent(part);
    if (event) parsed.push(event);
  }

  return { parsed, remainder };
}

export function appendSSEChunk(
  previousRemainder: string,
  chunk: string,
): SSEParseResult {
  return splitSSEEvents(previousRemainder + chunk);
}

function parseSSEEvent(rawEvent: string): SSEEvent | null {
  const lines = rawEvent.split('\n');
  let eventType = '';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  const dataText = dataLines.join('\n');
  if (!dataText || dataText === '[DONE]') return null;

  try {
    const data = JSON.parse(dataText);
    return {
      type: eventType || inferEventType(data),
      data,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

function inferEventType(data: unknown): string {
  if (data && typeof data === 'object' && 'type' in data) {
    const type = (data as { type?: unknown }).type;
    if (typeof type === 'string') return type;
  }
  return 'message';
}

