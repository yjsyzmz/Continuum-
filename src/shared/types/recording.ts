import type {
  CaptureMethod,
  InterruptionReason,
  SSEEvent,
} from './capture';

export interface VisibleBlock {
  type: 'text' | 'code' | 'artifact' | 'unknown';
  content: string;
  title?: string;
}

export interface Recording {
  requestId: string;
  taskId: string;
  conversationId?: string;
  userPrompt: string | null;
  startedAt: number;
  completedAt?: number;
  completed: boolean;
  interruptionReason?: InterruptionReason;
  accumulatedText: string;
  visibleBlocks?: VisibleBlock[];
  tokenCount?: number;
  modelUsed?: string;
  captureMethod: CaptureMethod;
  rawEvents?: SSEEvent[];
}

