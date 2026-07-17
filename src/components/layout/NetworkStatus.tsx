import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside className="network-toast" role="status" aria-live="polite">
      <WifiOff size={18} aria-hidden="true" />
      <div>
        <strong>You’re offline.</strong>
        <span>Saved screens still work; changes will need a connection.</span>
      </div>
    </aside>
  );
}
