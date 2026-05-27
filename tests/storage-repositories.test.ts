import { describe, expect, it } from 'vitest';
import {
  appendRecordingDelta,
  completeRecording,
  findRecordingByRequestId,
  startRecording,
} from '../src/storage/recording-repository';
import {
  ensureTaskForCapture,
  listTasks,
  markTaskMessageSaved,
} from '../src/storage/task-repository';

describe('storage repositories', () => {
  it('creates and reuses a task by conversation id', async () => {
    const first = await ensureTaskForCapture({
      requestId: 'req-1',
      conversationId: 'conv-1',
      userPrompt: 'Write a product spec for long task protection',
      startedAt: 1000,
      captureMethod: 'sse',
    });

    const second = await ensureTaskForCapture({
      requestId: 'req-2',
      conversationId: 'conv-1',
      userPrompt: 'Continue',
      startedAt: 2000,
      captureMethod: 'sse',
    });

    expect(second.id).toBe(first.id);
    expect(await listTasks()).toHaveLength(1);
  });

  it('stores recording deltas and marks a saved message', async () => {
    const task = await ensureTaskForCapture({
      requestId: 'req-1',
      conversationId: 'conv-1',
      userPrompt: 'Generate code',
      startedAt: 1000,
      captureMethod: 'sse',
    });

    await startRecording(task.id, {
      requestId: 'req-1',
      conversationId: 'conv-1',
      userPrompt: 'Generate code',
      startedAt: 1000,
      captureMethod: 'sse',
    });
    const updated = await appendRecordingDelta({
      requestId: 'req-1',
      textDelta: 'hello world',
    });
    const completed = await completeRecording('req-1', 3000);
    await markTaskMessageSaved(task.id, 'active');

    expect(updated?.accumulatedText).toBe('hello world');
    expect(completed?.completed).toBe(true);
    expect((await listTasks())[0].messageCount).toBe(1);
  });

  it('drops completed recordings that never captured visible text', async () => {
    const task = await ensureTaskForCapture({
      requestId: 'empty-req',
      conversationId: 'empty-conv',
      userPrompt: 'No visible text',
      startedAt: 1000,
      captureMethod: 'sse',
    });

    await startRecording(task.id, {
      requestId: 'empty-req',
      conversationId: 'empty-conv',
      userPrompt: 'No visible text',
      startedAt: 1000,
      captureMethod: 'sse',
    });

    const completed = await completeRecording('empty-req', 3000);

    expect(completed).toBeUndefined();
    expect(await findRecordingByRequestId('empty-req')).toBeUndefined();
  });
});
