import { db } from './db';
import type { UsageSnapshot } from '@/src/shared/types/usage';
import { createId } from '@/src/shared/utils/ids';

export async function addUsageSnapshot(
  snapshot: Omit<UsageSnapshot, 'id'>,
): Promise<UsageSnapshot> {
  const row: UsageSnapshot = {
    id: createId('usage'),
    ...snapshot,
  };
  await db.usageSnapshots.add(row);
  return row;
}

export async function latestUsageSnapshot(): Promise<UsageSnapshot | undefined> {
  return db.usageSnapshots.orderBy('capturedAt').last();
}

