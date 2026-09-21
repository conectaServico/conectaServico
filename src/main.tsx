import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import { installGlobalErrorLogging } from '@/utils/errorLog'
import { LOCKED_AUDIENCE } from '@/config/appTarget'

// Depois de um deploy novo, uma aba já aberta pode tentar buscar um chunk
// (rota lazy) que não existe mais no CDN — o Vite dispara esse evento em vez
// de deixar a promise do import() rejeitar sem contexto ("Failed to fetch
// dynamically imported module"). Recarregar pega o index.html/manifesto
// atual e resolve sozinho; o guard por sessionStorage evita loop se o
// problema for outro (ex.: sem internet).
window.addEventListener('vite:preloadError', (event) => {
  const key = 'vitePreloadReloadedAt';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

installGlobalErrorLogging()

// Apps nativos (cliente/profissional): ajustes de acabamento só do WebView (ver index.css).
if (LOCKED_AUDIENCE) document.documentElement.classList.add('app-native')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
