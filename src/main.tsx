import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';
import { StoreProvider } from './app/store';
import { trackViewport } from './app/viewport';
import './i18n';
import './styles.css';

registerSW({ immediate: true });
trackViewport();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
