import { useEffect, useState } from './view.js';
import { api } from './api.js';
export function usePageData(path) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [request, setRequest] = useState(0);
    useEffect(() => {
        if (!path)
            return;
        const controller = new AbortController();
        setData(null);
        setFailed(false);
        api(path, { signal: controller.signal })
            .then(value => { if (!controller.signal.aborted)
            setData(value); })
            .catch(() => { if (!controller.signal.aborted)
            setFailed(true); });
        return () => controller.abort();
    }, [path, request]);
    return { data, setData, failed, retry: () => setRequest(n => n + 1) };
}
