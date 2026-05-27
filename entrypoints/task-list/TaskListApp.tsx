import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clipboard,
  ExternalLink,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { copyTaskHandoff, resumeTask } from '@/src/core/recovery/simple-resume';
import { generateHandoff } from '@/src/core/handoff/generator';
import { findRecordingsByTaskId } from '@/src/storage/recording-repository';
import { listTasks } from '@/src/storage/task-repository';
import type { Task } from '@/src/shared/types/task';
import { taskStatusClass, taskStatusLabel } from '@/src/ui/status';
import { useLiveQueryValue } from '@/src/ui/use-live-query';

export default function TaskListApp() {
  const { value: tasks } = useLiveQueryValue(listTasks, [], []);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck size={22} aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Continuum</h1>
              <p className="text-sm text-slate-500">从 Claude 停下的地方继续走</p>
            </div>
          </div>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            href="https://claude.ai/new"
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={16} aria-hidden />
            新 Claude Chat
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[minmax(320px,420px)_1fr] lg:px-6">
        <section className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              暂无任务。打开 Claude.ai 并发送消息后,这里会出现本地保护记录。
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                selected={task.id === selectedTask?.id}
                task={task}
                onSelect={() => setSelectedTaskId(task.id)}
              />
            ))
          )}
        </section>

        <TaskDetail task={selectedTask} />
      </div>
    </main>
  );
}

function TaskCard({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`block w-full rounded-md border bg-white p-4 text-left shadow-sm transition ${
        selected ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-200 hover:border-slate-300'
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{task.name}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {task.messageCount} 条消息 · {new Date(task.lastMessageAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ring-1 ${taskStatusClass(
            task.status,
          )}`}
        >
          {taskStatusLabel(task.status)}
        </span>
      </div>
    </button>
  );
}

function TaskDetail({ task }: { task?: Task }) {
  const { value: recordings } = useLiveQueryValue(
    () => (task ? findRecordingsByTaskId(task.id) : Promise.resolve([])),
    [task?.id],
    [],
  );
  const [handoff, setHandoff] = useState('');
  const [copied, setCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);
  const lastRecording = recordings.at(-1);

  async function refreshPreview() {
    if (!task) return;
    await runTaskAction('preview', async () => {
      setHandoff(await generateHandoff(task.id));
      setActionNotice({ tone: 'success', text: 'Handoff 预览已更新。' });
    });
  }

  async function copyOnly() {
    if (!task) return;
    await runTaskAction('copy', async () => {
      const text = await copyTaskHandoff(task.id);
      setHandoff(text);
      setCopied(true);
      setActionNotice({ tone: 'success', text: '接力 Prompt 已复制到剪贴板。' });
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  async function copyAndOpen() {
    if (!task) return;
    await runTaskAction('resume', async () => {
      await resumeTask(task.id);
      setCopied(true);
      setActionNotice({
        tone: 'success',
        text: '接力 Prompt 已复制,并已打开新的 Claude Chat。',
      });
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  async function runTaskAction(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    setActionNotice(null);
    try {
      await action();
    } catch (error) {
      setActionNotice({
        tone: 'error',
        text: getActionErrorMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (!task) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        <FileText className="mx-auto mb-3 text-slate-400" size={28} aria-hidden />
        还没有可查看的任务
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{task.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {recordings.length} 条录制 · conversation {task.conversationId ?? 'unknown'}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${taskStatusClass(
              task.status,
            )}`}
          >
            {taskStatusLabel(task.status)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
            disabled={busyAction !== null}
            type="button"
            onClick={copyOnly}
          >
            {copied ? <Check size={16} aria-hidden /> : <Clipboard size={16} aria-hidden />}
            {busyAction === 'copy' ? '复制中...' : '复制接力 Prompt'}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={busyAction !== null}
            type="button"
            onClick={copyAndOpen}
          >
            <ExternalLink size={16} aria-hidden />
            {busyAction === 'resume' ? '打开中...' : '复制并打开新 Chat'}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={busyAction !== null}
            type="button"
            onClick={refreshPreview}
          >
            <FileText size={16} aria-hidden />
            {busyAction === 'preview' ? '生成中...' : '预览 Handoff'}
          </button>
        </div>

        {actionNotice ? (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              actionNotice.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
            role={actionNotice.tone === 'error' ? 'alert' : 'status'}
          >
            {actionNotice.tone === 'error' ? (
              <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden />
            ) : (
              <Check className="mt-0.5 shrink-0" size={16} aria-hidden />
            )}
            <span>{actionNotice.text}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3 border-b border-slate-200 p-5 text-sm">
        <Info label="消息数" value={task.messageCount.toString()} />
        <Info label="捕获方式" value={lastRecording?.captureMethod ?? '-'} />
        <Info label="最后保存" value={new Date(task.lastMessageAt).toLocaleTimeString()} />
      </div>

      <div className="p-5">
        <h3 className="mb-2 text-sm font-semibold">Handoff 预览</h3>
        <pre className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {handoff || '点击“预览 Handoff”生成接力内容。'}
        </pre>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getActionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `操作失败: ${error.message}`;
  }
  return '操作失败,请稍后重试或刷新任务页。';
}
