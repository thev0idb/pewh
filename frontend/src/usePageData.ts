import { useEffect, useState } from 'react';
import { api } from './api';

export function usePageData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setData(null);
    setFailed(false);
    api(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [path, request]);
  return { data, setData, failed, retry: () => setRequest(n => n + 1) };
}
