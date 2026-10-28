import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service worker: only in production builds. In dev it would fight the
// Vite dev server (stale cached modules, HMR weirdness). To try offline
// mode: npm --prefix client run build && npm --prefix client run preview.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failed (e.g. unsupported context): the app simply
      // stays online-only.
    })
  })
}
