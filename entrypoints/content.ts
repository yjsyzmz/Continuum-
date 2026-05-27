import { startClaudeDomCapture } from '@/src/capture/dom-capture';
import { isCaptureEnvelope, type CaptureEnvelope } from '@/src/shared/types/capture';
import { browser } from 'wxt/browser';

const INJECT_SOURCE = 'claude-task-safety-inject';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  runAt: 'document_start',
  main() {
    let lastInjectSeenAt = 0;

    injectMainWorldScript();

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.source !== INJECT_SOURCE) return;

      const message = event.data.payload;
      if (!isCaptureEnvelope(message)) return;

      lastInjectSeenAt = Date.now();
      void forwardToBackground(message);
    });

    startClaudeDomCapture({
      getLastInjectSeenAt: () => lastInjectSeenAt,
      onCapture: (message) => {
        void forwardToBackground(message);
      },
    });
  },
});

async function forwardToBackground(message: CaptureEnvelope): Promise<void> {
  try {
    await browser.runtime.sendMessage(message);
  } catch (error) {
    console.warn('[Claude Task Safety] failed to forward capture', error);
  }
}

function injectMainWorldScript(): void {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('/inject.js');
  script.dataset.claudeTaskSafety = 'true';
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}
