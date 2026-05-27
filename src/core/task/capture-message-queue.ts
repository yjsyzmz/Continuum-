import { handleCaptureMessage } from './task-service';
import type { CaptureEnvelope } from '@/src/shared/types/capture';

export type CaptureMessageHandler = (message: CaptureEnvelope) => Promise<void>;

export interface CaptureMessageQueue {
  enqueue: (message: CaptureEnvelope) => Promise<void>;
  drain: () => Promise<void>;
}

export function createCaptureMessageQueue(
  handler: CaptureMessageHandler = handleCaptureMessage,
  onError: (error: unknown) => void = console.error,
): CaptureMessageQueue {
  let queue = Promise.resolve();

  return {
    enqueue(message) {
      queue = queue.then(() => handler(message)).catch((error) => {
        onError(error);
      });
      return queue;
    },
    drain() {
      return queue;
    },
  };
}

