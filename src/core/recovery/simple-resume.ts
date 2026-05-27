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
}
