import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <aside className="update-toast" aria-live="polite" aria-label="App update available">
      <div>
        <strong>A fresh round is ready.</strong>
        <p>Update BeerMe to get the latest improvements.</p>
      </div>
      <button className="icon-button" type="button" onClick={() => void updateServiceWorker(true)}>
        <RefreshCw size={18} aria-hidden="true" />
        <span className="sr-only">Update app</span>
      </button>
      <button className="icon-button" type="button" onClick={() => setNeedRefresh(false)}>
        <X size={18} aria-hidden="true" />
        <span className="sr-only">Dismiss update</span>
      </button>
    </aside>
  );
}
