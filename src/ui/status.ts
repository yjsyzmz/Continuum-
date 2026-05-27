import type { TaskStatus } from '@/src/shared/types/task';

export function taskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    active: '保护中',
    interrupted: '已中断',
    paused: '已暂停',
    completed: '已完成',
    abandoned: '已放弃',
    resumed: '已恢复',
  };
  return labels[status];
}

export function taskStatusClass(status: TaskStatus): string {
  const classes: Record<TaskStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    interrupted: 'bg-amber-50 text-amber-700 ring-amber-200',
    paused: 'bg-slate-100 text-slate-700 ring-slate-200',
    completed: 'bg-blue-50 text-blue-700 ring-blue-200',
    abandoned: 'bg-rose-50 text-rose-700 ring-rose-200',
    resumed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  };
  return classes[status];
}

