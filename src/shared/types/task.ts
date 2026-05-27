export type TaskStatus =
  | 'active'
  | 'interrupted'
  | 'paused'
  | 'completed'
  | 'abandoned'
  | 'resumed';

export interface Task {
  id: string;
  conversationId?: string;
  name: string;
  status: TaskStatus;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  lastMessageAt: number;
  tags?: string[];
  notes?: string;
  parentTaskId?: string;
}

