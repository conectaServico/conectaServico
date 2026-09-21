import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Faixa "Sem conexão" no topo — some sozinha quando a internet volta. */
const OfflineBanner = () => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="sticky top-[var(--safe-top)] z-[55] flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-bold px-4 py-2"
    >
      <WifiOff className="w-4 h-4" />
      Sem conexão com a internet. Reconectando…
    </div>
  );
};

export default OfflineBanner;
