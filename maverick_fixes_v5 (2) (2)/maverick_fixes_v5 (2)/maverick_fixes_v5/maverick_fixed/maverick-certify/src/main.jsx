import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply the saved (or system-preferred) theme before the first paint to
// avoid a flash of the wrong theme.
(() => {
  const stored = window.localStorage.getItem('mc_theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = stored === 'light' || stored === 'dark' ? stored : (prefersLight ? 'light' : 'dark');
  if (theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
