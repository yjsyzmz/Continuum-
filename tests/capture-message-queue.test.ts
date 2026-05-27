import { describe, expect, it } from 'vitest';
import { createCaptureMessageQueue } from '../src/core/task/capture-message-queue';
import { findRecordingsByTaskId } from '../src/storage/recording-repository';
import { listTasks } from '../src/storage/task-repository';

describe('capture message queue', () => {
  it('preserves rapid start/delta/end ordering before storage writes settle', async () => {
    const queue = createCaptureMessageQueue();

    const start = queue.enqueue({
      source: 'claude-task-safety',
      type: 'CAPTURE_START',
      payload: {
        requestId: 'rapid-req',
        conversationId: 'rapid-conv',
        userPrompt: 'Test rapid capture ordering',
        startedAt: Date.now(),
        captureMethod: 'dom',
      },
    });
    const delta = queue.enqueue({
      source: 'claude-task-safety',
      type: 'CAPTURE_DELTA',
      payload: {
        requestId: 'rapid-req',
        textDelta: 'Visible output should not be dropped.',
      },
    });
    const end = queue.enqueue({
      source: 'claude-task-safety',
      type: 'CAPTURE_END',
      payload: {
        requestId: 'rapid-req',
      },
    });

    await Promise.all([start, delta, end, queue.drain()]);

    const task = (await listTasks())[0];
    const recordings = await findRecordingsByTaskId(task.id);

    expect(task.messageCount).toBe(1);
    expect(recordings[0].completed).toBe(true);
    expect(recordings[0].accumulatedText).toBe(
      'Visible output should not be dropped.',
    );
  });
});
