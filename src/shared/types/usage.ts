export interface UsageSnapshot {
  id: string;
  capturedAt: number;
  windowName?: string;
  remainingPercent?: number;
  resetAt?: number;
  raw?: unknown;
}

