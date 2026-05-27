import { Activity, ClipboardList, ExternalLink, ShieldCheck } from 'lucide-react';
import { browser } from 'wxt/browser';
import { listTasks } from '@/src/storage/task-repository';
import { useLiveQueryValue } from '@/src/ui/use-live-query';

function App() {
  const { value: tasks } = useLiveQueryValue(listTasks, [], []);
  const activeCount = tasks.filter((task) => task.status === 'active').length;
  const interruptedCount = tasks.filter((task) => task.status === 'interrupted').length;
  const latestTask = tasks[0];

  const openTaskList = () => {
    void browser.tabs.create({
      url: browser.runtime.getURL('/task-list.html'),
    });
  };

  return (
    <main className="w-[360px] bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <div>
            <h1 className="text-base font-semibold leading-5">Claude Task Safety</h1>
            <p className="text-xs text-slate-500">Local-first task protection</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 px-4 py-3">
        <Metric label="任务" value={tasks.length} />
        <Metric label="保护中" value={activeCount} />
        <Metric label="中断" value={interruptedCount} tone={interruptedCount ? 'amber' : 'slate'} />
      </section>

      <section className="px-4 pb-4">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Activity size={16} aria-hidden />
            当前任务
          </div>
          {latestTask ? (
            <div>
              <p className="truncate text-sm font-semibold">{latestTask.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {latestTask.messageCount} 条消息 · 最后保存 {formatTime(latestTask.lastMessageAt)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无录制任务</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
            type="button"
            onClick={openTaskList}
          >
            <ClipboardList size={16} aria-hidden />
            任务列表
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            type="button"
            onClick={() => void browser.tabs.create({ url: 'https://claude.ai/new' })}
          >
            <ExternalLink size={16} aria-hidden />
            新 Chat
          </button>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'amber';
}) {
  const valueClass = tone === 'amber' ? 'text-amber-700' : 'text-slate-950';
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className={`text-lg font-semibold ${valueClass}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default App;
