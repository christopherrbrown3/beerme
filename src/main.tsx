import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { AppProviders } from './lib/AppProviders';
import './styles/index.css';
import { restoreStoredRedirect } from './utils/redirect';

restoreStoredRedirect(window.sessionStorage, window.history);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
