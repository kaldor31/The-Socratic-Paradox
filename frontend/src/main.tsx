import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './auth/AuthContext';
import { EncryptionProvider } from './auth/EncryptionContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ThemeProvider } from './theme/ThemeContext';

function applyInitialTheme() {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem('sp-theme');
  const isLight = stored === 'light' || (!stored && window.matchMedia('(prefers-color-scheme: light)').matches);
  if (isLight) {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}
applyInitialTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <EncryptionProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ThemeProvider>
        </LanguageProvider>
      </EncryptionProvider>
    </AuthProvider>
  </React.StrictMode>
);
