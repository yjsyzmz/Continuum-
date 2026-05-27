import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

export function useLiveQueryValue<T>(
  query: () => Promise<T>,
  deps: DependencyList,
  initialValue: T,
): { value: T; error: unknown } {
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next(nextValue) {
        setValue(nextValue);
        setError(null);
      },
      error(nextError) {
        setError(nextError);
      },
    });

    return () => subscription.unsubscribe();
  }, deps);

  return { value, error };
}
