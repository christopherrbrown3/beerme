import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { AppProviders } from './lib/AppProviders';
import './styles/index.css';
import { restoreStoredRedirect } from './utils/redirect';

let redirectStorage: Storage | null = null;
try {
  redirectStorage = window.sessionStorage;
} catch {
  // The Pages bridge has a query fallback for browsers that block Web Storage.
}
restoreStoredRedirect(redirectStorage, window.history);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
