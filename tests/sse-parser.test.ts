import { describe, expect, it } from 'vitest';
import { appendSSEChunk, splitSSEEvents } from '../src/capture/sse-parser';

describe('SSE parser', () => {
  it('handles an event split across chunks', () => {
    const first = splitSSEEvents(
      'event: content_block_delta\ndata: {"delta":{"type":"text_de',
    );
    expect(first.parsed).toHaveLength(0);
    expect(first.remainder).toContain('text_de');

    const second = appendSSEChunk(
      first.remainder,
      'lta","text":"hi"}}\n\n',
    );
    expect(second.parsed).toHaveLength(1);
    expect(second.parsed[0].type).toBe('content_block_delta');
    expect(second.parsed[0].data).toMatchObject({
      delta: { type: 'text_delta', text: 'hi' },
    });
  });

  it('ignores malformed JSON without throwing', () => {
    const result = splitSSEEvents('event: content_block_delta\ndata: nope\n\n');
    expect(result.parsed).toHaveLength(0);
    expect(result.remainder).toBe('');
  });

  it('parses message_stop events', () => {
    const result = splitSSEEvents('event: message_stop\ndata: {"type":"message_stop"}\n\n');
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].type).toBe('message_stop');
  });
});

