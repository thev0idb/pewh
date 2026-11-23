import { useEffect } from 'react';

// Kunci ujian: fullscreen, blokir klik kanan, blur/tab-switch dihitung,
// tombol pintas devtools dinonaktifkan, keluar halaman = auto submit.
// Catatan: pembatasan penuh (mencegah task switch OS) hanya bisa lewat aplikasi kiosk/SEB.
export function useExamLock(onViolation: () => void) {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['u', 'p', 't', 'n', 'w'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault(); onViolation();
      }
    };
    const onVis = () => { if (document.hidden) onViolation(); };
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onContext = (e: MouseEvent) => { e.preventDefault(); onViolation(); };

    document.documentElement.requestFullscreen?.().catch(() => {});
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('copy', block); document.addEventListener('cut', block);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('copy', block); document.removeEventListener('cut', block);
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);
}
