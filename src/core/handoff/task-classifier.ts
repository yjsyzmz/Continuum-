import type { Recording } from '@/src/shared/types/recording';
import type { Task } from '@/src/shared/types/task';

export type TaskType =
  | 'long-writing'
  | 'coding-project'
  | 'batch-task'
  | 'analysis'
  | 'generic';

export function classifyTask(task: Task, recordings: Recording[]): TaskType {
  const firstPrompt = recordings[0]?.userPrompt ?? task.name;
  const allText = recordings.map((recording) => recording.accumulatedText).join('\n');
  const codeBlockCount = (allText.match(/```/g) ?? []).length / 2;

  if (codeBlockCount > 2 || /代码|项目|组件|bug|报错|TypeScript|React/i.test(firstPrompt)) {
    return 'coding-project';
  }

  if (/翻译|分类|批量|逐条|清单|第\s*\d+\s*条/.test(firstPrompt)) {
    return 'batch-task';
  }

  const averageLength = allText.length / Math.max(1, recordings.length);
  if (averageLength > 2500 && codeBlockCount < 2) {
    return 'long-writing';
  }

  if (/分析|研究|调研|结论|证据|框架/.test(firstPrompt) || /^(##|\d+\.|- )/m.test(allText)) {
    return 'analysis';
  }

  return 'generic';
}

