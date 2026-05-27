import type { CaptureEnvelope } from '@/src/shared/types/capture';
import {
  appendRecordingDelta,
  completeRecording,
  interruptRecording,
  startRecording,
} from '@/src/storage/recording-repository';
import {
  ensureTaskForCapture,
  markTaskMessageSaved,
  touchTask,
} from '@/src/storage/task-repository';

export async function handleCaptureMessage(
  message: CaptureEnvelope,
): Promise<void> {
  switch (message.type) {
    case 'CAPTURE_START': {
      const task = await ensureTaskForCapture(message.payload);
      await startRecording(task.id, message.payload);
      await touchTask(task.id);
      return;
    }
    case 'CAPTURE_DELTA': {
      const recording = await appendRecordingDelta(message.payload);
      if (recording) await touchTask(recording.taskId);
      return;
    }
    case 'CAPTURE_END': {
      const recording = await completeRecording(
        message.payload.requestId,
        message.payload.completedAt,
      );
      if (recording) await markTaskMessageSaved(recording.taskId, 'active');
      return;
    }
    case 'CAPTURE_INTERRUPTED': {
      const recording = await interruptRecording(message.payload);
      if (recording) {
        await markTaskMessageSaved(recording.taskId, 'interrupted');
      }
      return;
    }
  }
}

