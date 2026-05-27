import { db } from './db';
import type {
  CaptureDeltaPayload,
  CaptureInterruptedPayload,
  CaptureStartPayload,
} from '@/src/shared/types/capture';
import type { Recording } from '@/src/shared/types/recording';

export async function startRecording(
  taskId: string,
  payload: CaptureStartPayload,
): Promise<Recording> {
  const recording: Recording = {
    requestId: payload.requestId,
    taskId,
    conversationId: payload.conversationId ?? undefined,
    userPrompt: payload.userPrompt,
    startedAt: payload.startedAt,
    completed: false,
    accumulatedText: payload.accumulatedText ?? '',
    captureMethod: payload.captureMethod,
  };

  await db.recordings.put(recording);
  return recording;
}

export async function appendRecordingDelta(
  payload: CaptureDeltaPayload,
): Promise<Recording | undefined> {
  const recording = await db.recordings.get(payload.requestId);
  if (!recording) return undefined;

  const accumulatedText =
    typeof payload.accumulatedText === 'string'
      ? payload.accumulatedText
      : `${recording.accumulatedText}${payload.textDelta ?? ''}`;

  const updated: Recording = {
    ...recording,
    accumulatedText,
  };

  await db.recordings.put(updated);
  return updated;
}

export async function completeRecording(
  requestId: string,
  completedAt = Date.now(),
): Promise<Recording | undefined> {
  const recording = await db.recordings.get(requestId);
  if (!recording) return undefined;

  if (!recording.accumulatedText.trim()) {
    await db.recordings.delete(requestId);
    return undefined;
  }

  const updated: Recording = {
    ...recording,
    completed: true,
    completedAt,
    interruptionReason: undefined,
  };
  await db.recordings.put(updated);
  return updated;
}

export async function interruptRecording(
  payload: CaptureInterruptedPayload,
): Promise<Recording | undefined> {
  const recording = await db.recordings.get(payload.requestId);
  if (!recording) return undefined;

  const updated: Recording = {
    ...recording,
    completed: false,
    completedAt: payload.completedAt ?? Date.now(),
    interruptionReason: payload.reason,
  };
  await db.recordings.put(updated);
  return updated;
}

export async function findRecordingByRequestId(
  requestId: string,
): Promise<Recording | undefined> {
  return db.recordings.get(requestId);
}

export async function findRecordingsByTaskId(
  taskId: string,
): Promise<Recording[]> {
  return db.recordings.where('taskId').equals(taskId).sortBy('startedAt');
}
