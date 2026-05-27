import { db } from './db';
import type { CaptureStartPayload } from '@/src/shared/types/capture';
import type { Task, TaskStatus } from '@/src/shared/types/task';
import { createId } from '@/src/shared/utils/ids';

export async function ensureTaskForCapture(
  payload: CaptureStartPayload,
): Promise<Task> {
  if (payload.conversationId) {
    const existing = await db.tasks
      .where('conversationId')
      .equals(payload.conversationId)
      .first();
    if (existing) {
      const now = Date.now();
      const updated: Task = {
        ...existing,
        status: existing.status === 'interrupted' ? 'active' : existing.status,
        updatedAt: now,
        lastMessageAt: now,
      };
      await db.tasks.put(updated);
      return updated;
    }
  }

  const now = Date.now();
  const task: Task = {
    id: createId('task'),
    conversationId: payload.conversationId ?? undefined,
    name: buildTaskName(payload.userPrompt, payload.conversationId),
    status: 'active',
    messageCount: 0,
    createdAt: payload.startedAt || now,
    updatedAt: now,
    lastMessageAt: now,
  };

  await db.tasks.add(task);
  return task;
}

export async function findTaskById(taskId: string): Promise<Task | undefined> {
  return db.tasks.get(taskId);
}

export async function listTasks(): Promise<Task[]> {
  return db.tasks.orderBy('updatedAt').reverse().toArray();
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const now = Date.now();
  await db.tasks.update(taskId, {
    status,
    updatedAt: now,
    lastMessageAt: now,
  });
}

export async function markTaskMessageSaved(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const now = Date.now();
  await db.tasks.put({
    ...task,
    status,
    messageCount: task.messageCount + 1,
    updatedAt: now,
    lastMessageAt: now,
  });
}

export async function touchTask(taskId: string): Promise<void> {
  const now = Date.now();
  await db.tasks.update(taskId, {
    updatedAt: now,
    lastMessageAt: now,
  });
}

function buildTaskName(
  userPrompt: string | null,
  conversationId: string | null,
): string {
  if (userPrompt) {
    const firstLine = userPrompt.split(/\r?\n/)[0]?.trim();
    if (firstLine) return truncate(firstLine, 42);
  }

  if (conversationId) return `Claude task ${conversationId.slice(0, 8)}`;
  return 'Claude protected task';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

