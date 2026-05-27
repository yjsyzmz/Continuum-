import { createCaptureMessageQueue } from '@/src/core/task/capture-message-queue';
import { isCaptureEnvelope } from '@/src/shared/types/capture';
import { browser } from 'wxt/browser';

const captureQueue = createCaptureMessageQueue(undefined, (error) => {
  console.error('[Claude Task Safety] capture message failed', error);
});

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (!isCaptureEnvelope(message)) return;
    void captureQueue.enqueue(message);
  });
});
