import { describe, expect, it } from 'vitest';
import { generateHandoff } from '../src/core/handoff/generator';
import { handleCaptureMessage } from '../src/core/task/task-service';
import { listTasks } from '../src/storage/task-repository';

describe('handoff generator', () => {
  it('returns a clear empty-recording handoff', async () => {
    await handleCaptureMessage({
      source: 'claude-task-safety',
      type: 'CAPTURE_START',
      payload: {
        requestId: 'req-empty',
        conversationId: 'conv-empty',
        userPrompt: 'Draft a report',
        startedAt: Date.now(),
        captureMethod: 'dom',
      },
    });

    const task = (await listTasks())[0];
    const handoff = await generateHandoff(task.id);

    expect(handoff).toContain('Draft a report');
    expect(handoff).toContain('最后一轮没有捕获到可见输出');
  });

  it('includes original goal, completed output, and next step', async () => {
    await recordCompletedTurn('req-1', 'conv-1', '写一份 AI 产品调研文档', '第一章: 背景与痛点。');
    await recordCompletedTurn('req-2', 'conv-1', '继续写竞品分析', '第二章: 竞品与差异化。');

    const task = (await listTasks())[0];
    const handoff = await generateHandoff(task.id);

    expect(handoff).toContain('写一份 AI 产品调研文档');
    expect(handoff).toContain('第一章: 背景与痛点。');
    expect(handoff).toContain('第二章: 竞品与差异化。');
    expect(handoff).toContain('下一步请求');
  });

  it('marks interrupted last output and preserves the tail', async () => {
    await handleCaptureMessage({
      source: 'claude-task-safety',
      type: 'CAPTURE_START',
      payload: {
        requestId: 'req-interrupted',
        conversationId: 'conv-interrupted',
        userPrompt: 'Generate a React component',
        startedAt: Date.now(),
        captureMethod: 'sse',
      },
    });
    await handleCaptureMessage({
      source: 'claude-task-safety',
      type: 'CAPTURE_DELTA',
      payload: {
        requestId: 'req-interrupted',
        textDelta: `${'code '.repeat(4000)}final-important-tail`,
      },
    });
    await handleCaptureMessage({
      source: 'claude-task-safety',
      type: 'CAPTURE_INTERRUPTED',
      payload: {
        requestId: 'req-interrupted',
        reason: 'network',
      },
    });

    const task = (await listTasks())[0];
    const handoff = await generateHandoff(task.id);

    expect(handoff).toContain('可能不完整');
    expect(handoff).toContain('final-important-tail');
  });
});

async function recordCompletedTurn(
  requestId: string,
  conversationId: string,
  userPrompt: string,
  text: string,
) {
  await handleCaptureMessage({
    source: 'claude-task-safety',
    type: 'CAPTURE_START',
    payload: {
      requestId,
      conversationId,
      userPrompt,
      startedAt: Date.now(),
      captureMethod: 'sse',
    },
  });
  await handleCaptureMessage({
    source: 'claude-task-safety',
    type: 'CAPTURE_DELTA',
    payload: {
      requestId,
      textDelta: text,
    },
  });
  await handleCaptureMessage({
    source: 'claude-task-safety',
    type: 'CAPTURE_END',
    payload: {
      requestId,
    },
  });
}

