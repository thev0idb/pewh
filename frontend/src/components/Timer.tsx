import { useEffect, useRef, useState } from 'react';

export default function Timer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    let timeout: number;
    let expired = false;

    function refresh() {
      window.clearTimeout(timeout);
      if (expired) return;
      const remaining = Math.max(0, deadline - Date.now());
      setLeft(Math.ceil(remaining / 1000));
      if (remaining === 0) {
        expired = true;
        onExpireRef.current();
        return;
      }
      timeout = window.setTimeout(refresh, remaining % 1000 || 1000);
    }

    timeout = window.setTimeout(refresh, 0);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [seconds]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span className={`timer ${left <= 300 ? 'danger' : ''}`}>{mm}:{ss}</span>;
}
