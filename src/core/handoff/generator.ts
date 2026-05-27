import { findRecordingsByTaskId } from '@/src/storage/recording-repository';
import { findTaskById } from '@/src/storage/task-repository';
import type { Recording } from '@/src/shared/types/recording';
import type { Task } from '@/src/shared/types/task';
import { classifyTask, type TaskType } from './task-classifier';

export type HandoffMode = 'complete' | 'compact' | 'auto';

interface HandoffOptions {
  mode?: HandoffMode;
  targetContextHint?: number;
}

export async function generateHandoff(
  taskId: string,
  options: HandoffOptions = {},
): Promise<string> {
  const task = await findTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const recordings = (await findRecordingsByTaskId(taskId)).filter(
    (recording) =>
      recording.accumulatedText.trim() ||
      recording.interruptionReason ||
      !recording.completed,
  );
  if (recordings.length === 0) {
    return `# 任务接力 - ${task.name}\n\n此任务还没有录制内容。`;
  }

  const taskType = classifyTask(task, recordings);
  const mode = chooseMode(taskType, recordings, options);
  const lastRecording = recordings.at(-1);
  const interrupted = task.status === 'interrupted' || recordings.some((item) => item.interruptionReason);

  return [
    `# 任务接力 - ${task.name}`,
    '',
    '## 1. 原始任务目标',
    recordings[0]?.userPrompt || task.name,
    '',
    '## 2. 当前状态',
    `- 任务类型: ${formatTaskType(taskType)}`,
    `- 已完成轮次: ${task.messageCount}`,
    `- 最后保存时间: ${formatDate(task.lastMessageAt)}`,
    `- 状态: ${formatStatus(task.status)}`,
    '- 恢复要求: 继续任务,不要从头重写,不要重复已完成内容',
    '',
    '## 3. 已完成产物 / 关键上下文',
    buildCompletedSection(recordings, mode),
    '',
    '## 4. 最近几轮对话',
    buildRecentTurns(recordings),
    '',
    `## 5. 最后一轮输出${interrupted ? '(可能不完整)' : ''}`,
    `用户请求:\n${lastRecording?.userPrompt || '未捕获到用户请求'}`,
    '',
    `Claude 已生成内容:\n${preserveLastOutput(lastRecording)}`,
    '',
    interrupted
      ? '注意: 上一轮输出可能在生成过程中被中断。请从最后完整语义处继续,不要从头重写。'
      : '',
    '',
    '## 6. 下一步请求',
    buildNextStepInstruction(task, taskType, lastRecording),
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function chooseMode(
  taskType: TaskType,
  recordings: Recording[],
  options: HandoffOptions,
): Exclude<HandoffMode, 'auto'> {
  if (options.mode && options.mode !== 'auto') return options.mode;
  const totalLength = recordings.reduce(
    (sum, recording) => sum + recording.accumulatedText.length,
    0,
  );
  if (options.targetContextHint && totalLength > options.targetContextHint) {
    return 'compact';
  }
  if (taskType === 'long-writing' || taskType === 'coding-project') {
    return 'complete';
  }
  return totalLength > 18000 ? 'compact' : 'complete';
}

function buildCompletedSection(
  recordings: Recording[],
  mode: Exclude<HandoffMode, 'auto'>,
): string {
  const completed = recordings.slice(0, -1);
  if (completed.length === 0) return '暂无早期完整轮次;请重点参考最后一轮输出。';

  if (mode === 'compact') {
    return completed
      .map((recording, index) => {
        const text = clipMiddle(recording.accumulatedText, 1200);
        return `### 轮次 ${index + 1}\n${text || '(该轮没有捕获到可见输出)'}`;
      })
      .join('\n\n');
  }

  return completed
    .map((recording, index) => {
      const text = clipMiddle(recording.accumulatedText, 5000);
      return `### 轮次 ${index + 1}\n${text || '(该轮没有捕获到可见输出)'}`;
    })
    .join('\n\n');
}

function buildRecentTurns(recordings: Recording[]): string {
  return recordings
    .slice(-3)
    .map((recording, index) => {
      return [
        `### 最近轮次 ${index + 1}`,
        `用户: ${recording.userPrompt || '未捕获到用户请求'}`,
        `Claude: ${clipMiddle(recording.accumulatedText, 1800) || '(无可见输出)'}`,
      ].join('\n');
    })
    .join('\n\n');
}

function preserveLastOutput(recording: Recording | undefined): string {
  if (!recording) return '(无最后一轮输出)';
  return clipMiddle(recording.accumulatedText, 16000) || '(最后一轮没有捕获到可见输出)';
}

function buildNextStepInstruction(
  task: Task,
  taskType: TaskType,
  lastRecording: Recording | undefined,
): string {
  const base = '请基于以上上下文继续任务,延续当前结构和风格。';
  if (task.status === 'interrupted' || lastRecording?.interruptionReason) {
    return `${base} 从最后完整语义处继续,不要重写已经完成的部分。`;
  }
  if (taskType === 'batch-task') {
    return `${base} 先识别已处理/未处理边界,再继续剩余条目。`;
  }
  if (taskType === 'coding-project') {
    return `${base} 优先保留现有文件结构、代码约束和未完成片段。`;
  }
  return base;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatStatus(status: Task['status']): string {
  const labels: Record<Task['status'], string> = {
    active: '保护中',
    interrupted: '已中断',
    paused: '已暂停',
    completed: '已完成',
    abandoned: '已放弃',
    resumed: '已恢复',
  };
  return labels[status] ?? status;
}

function formatTaskType(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    'long-writing': '长文写作',
    'coding-project': '代码项目',
    'batch-task': '批量任务',
    analysis: '分析研究',
    generic: '通用任务',
  };
  return labels[type];
}

function clipMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const headLength = Math.floor(maxLength * 0.65);
  const tailLength = maxLength - headLength;
  return `${text.slice(0, headLength)}\n\n...[中间内容已压缩,保留开头和断点附近内容]...\n\n${text.slice(-tailLength)}`;
}
