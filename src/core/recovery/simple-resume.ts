import { browser } from 'wxt/browser';
import { generateHandoff } from '@/src/core/handoff/generator';

export async function copyTaskHandoff(taskId: string): Promise<string> {
  const handoff = await generateHandoff(taskId);
  await navigator.clipboard.writeText(handoff);
  return handoff;
}

export async function resumeTask(taskId: string): Promise<void> {
  await copyTaskHandoff(taskId);
  await browser.tabs.create({ url: 'https://claude.ai/new' });

  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: 'Handoff copied',
      message: 'Paste it into the new Claude chat to continue the task.',
    });
  } catch {
    // Notifications are helpful but not required for the recovery flow.
  }
}

