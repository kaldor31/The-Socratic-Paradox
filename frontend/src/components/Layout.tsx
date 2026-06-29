import type { ReactNode } from 'react';
import { Sparkles, BookOpen, BarChart3, Plus, User, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

type View = 'onboarding' | 'wizard' | 'dashboard' | 'entries' | 'account' | 'settings' | 'auth';

interface LayoutProps {
  activeView: View;
  onNavigate: (view: View) => void;
  onOpenAuth: () => void;
  children: ReactNode;
}

export function Layout({ activeView, onNavigate, onOpenAuth, children }: LayoutProps) {
  const { t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  const nav = [
    { id: 'onboarding' as View, label: t('nav.intro'), icon: Sparkles },
    { id: 'wizard' as View, label: t('nav.newSession'), icon: Plus },
    { id: 'dashboard' as View, label: t('nav.dashboard'), icon: BarChart3 },
    { id: 'entries' as View, label: t('nav.entries'), icon: BookOpen },
  ].filter(item => isAuthenticated || item.id === 'onboarding');

  return (
    <div className="min-h-screen bg-marble-midnight text-ink">
      <nav className="sticky top-0 z-50 border-b border-marble-700 bg-marble-900/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-rust to-accent-gold text-white shadow-glow-gold">
              <Sparkles size={18} />
            </span>
            <h1 className="font-serif text-xl font-bold tracking-tight">
              <span className="text-gradient">Socratic</span> Paradox
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {nav.map(item => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'bg-marble-800 text-white shadow-glow-gold'
                      : 'text-ink-muted hover:bg-marble-800/60 hover:text-ink'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('account')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeView === 'account'
                      ? 'bg-marble-800 text-white shadow-glow-gold'
                      : 'text-ink-muted hover:bg-marble-800/60 hover:text-ink'
                  }`}
                >
                  <User size={16} />
                  <span className="hidden sm:inline">{t('nav.account')}</span>
                </button>
                <button
                  onClick={() => onNavigate('settings')}
                  className={`rounded-lg px-2 py-2 text-sm transition-all ${
                    activeView === 'settings' ? 'text-accent-gold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Settings size={16} />
                </button>
                <button onClick={logout} className="text-ink-muted hover:text-red-400">
                  <span className="hidden sm:inline text-sm">{t('nav.signOut')}</span>
                </button>
              </div>
            ) : (
              <button onClick={onOpenAuth} className="btn-primary text-sm">
                {t('nav.signIn')}
              </button>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">{children}</main>
    </div>
  );
}
