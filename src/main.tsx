import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { AppProviders } from './lib/AppProviders';
import './styles/index.css';

const redirectPath = window.sessionStorage.getItem('beerme:redirect');

if (redirectPath) {
  window.sessionStorage.removeItem('beerme:redirect');
  window.history.replaceState(null, '', redirectPath);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
