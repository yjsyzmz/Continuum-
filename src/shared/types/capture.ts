export type CaptureMethod = 'sse' | 'dom';

export type SSEEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'error'
  | string;

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

export interface CaptureStartPayload {
  requestId: string;
  conversationId: string | null;
  userPrompt: string | null;
  startedAt: number;
  accumulatedText?: string;
  captureMethod: CaptureMethod;
  url?: string;
}

export interface CaptureDeltaPayload {
  requestId: string;
  textDelta?: string;
  event?: SSEEvent;
  accumulatedText?: string;
}

export interface CaptureEndPayload {
  requestId: string;
  completedAt?: number;
}

export type InterruptionReason =
  | 'usage_limit'
  | 'network'
  | 'user_cancel'
  | 'unknown';

export interface CaptureInterruptedPayload {
  requestId: string;
  reason: InterruptionReason;
  completedAt?: number;
}

export type CaptureEnvelope =
  | {
      source: 'claude-task-safety';
      type: 'CAPTURE_START';
      payload: CaptureStartPayload;
    }
  | {
      source: 'claude-task-safety';
      type: 'CAPTURE_DELTA';
      payload: CaptureDeltaPayload;
    }
  | {
      source: 'claude-task-safety';
      type: 'CAPTURE_END';
      payload: CaptureEndPayload;
    }
  | {
      source: 'claude-task-safety';
      type: 'CAPTURE_INTERRUPTED';
      payload: CaptureInterruptedPayload;
    };

export function isCaptureEnvelope(value: unknown): value is CaptureEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CaptureEnvelope>;
  return (
    candidate.source === 'claude-task-safety' &&
    typeof candidate.type === 'string' &&
    'payload' in candidate
  );
}

