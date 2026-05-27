import Dexie, { type Table } from 'dexie';
import type { Recording } from '@/src/shared/types/recording';
import type { Task } from '@/src/shared/types/task';
import type { UsageSnapshot } from '@/src/shared/types/usage';

export const DB_NAME = 'claude-task-safety';

export class ClaudeTaskSafetyDb extends Dexie {
  tasks!: Table<Task, string>;
  recordings!: Table<Recording, string>;
  usageSnapshots!: Table<UsageSnapshot, string>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      tasks: '&id, conversationId, status, updatedAt, lastMessageAt',
      recordings:
        '&requestId, taskId, conversationId, startedAt, completed, completedAt',
      usageSnapshots: '&id, capturedAt',
    });
  }
}

export const db = new ClaudeTaskSafetyDb();

