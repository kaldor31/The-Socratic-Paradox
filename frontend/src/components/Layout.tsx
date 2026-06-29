import { useState, type ReactNode } from 'react';
import { Sparkles, BookOpen, BarChart3, Plus, Notebook, User, Settings, Menu, X, Quote } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useConfirm } from './ConfirmDialog';

type View = 'onboarding' | 'quotes' | 'wizard' | 'dashboard' | 'entries' | 'journal' | 'account' | 'settings' | 'auth';

interface LayoutProps {
  activeView: View;
  onNavigate: (view: View) => void;
  onOpenAuth: () => void;
  children: ReactNode;
}

export function Layout({ activeView, onNavigate, onOpenAuth, children }: LayoutProps) {
  const { t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = isAuthenticated
    ? [
        { id: 'quotes' as View, label: t('nav.quotes'), icon: Quote },
        { id: 'wizard' as View, label: t('nav.newSession'), icon: Plus },
        { id: 'dashboard' as View, label: t('nav.dashboard'), icon: BarChart3 },
        { id: 'entries' as View, label: t('nav.entries'), icon: BookOpen },
        { id: 'journal' as View, label: t('nav.journal'), icon: Notebook },
      ]
    : [{ id: 'onboarding' as View, label: t('nav.intro'), icon: Sparkles }];

  const menuItems = isAuthenticated
    ? [
        ...nav,
        { id: 'account' as View, label: t('nav.account'), icon: User },
        { id: 'settings' as View, label: t('nav.settings'), icon: Settings },
      ]
    : [{ id: 'onboarding' as View, label: t('nav.intro'), icon: Sparkles }];

  const handleNavigate = (view: View) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('nav.signOut'),
      message: t('auth.signOutConfirm'),
      isDanger: true,
      confirmLabel: t('nav.signOut'),
    });
    if (ok) logout();
  };

  return (
    <div className="min-h-screen bg-marble-midnight text-ink">
      <nav className="sticky top-0 z-40 border-b border-marble-700 bg-marble-900/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-rust to-accent-gold text-white shadow-glow-gold">
              <Sparkles size={18} />
            </span>
            <h1 className="font-serif text-lg font-bold tracking-tight sm:text-xl">
              <span className="text-gradient">Socratic</span> Paradox
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-1 sm:flex sm:flex-wrap sm:gap-2">
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
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {isAuthenticated && user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => onNavigate('account')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      activeView === 'account'
                        ? 'bg-marble-800 text-white shadow-glow-gold'
                        : 'text-ink-muted hover:bg-marble-800/60 hover:text-ink'
                    }`}
                  >
                    <User size={16} />
                    <span>{t('nav.account')}</span>
                  </button>
                  <button
                    onClick={() => onNavigate('settings')}
                    className={`rounded-lg px-2 py-2 text-sm transition-all ${
                      activeView === 'settings' ? 'text-accent-gold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-2 py-2 text-sm text-ink-muted transition-all hover:bg-marble-800/60 hover:text-red-400"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <button onClick={onOpenAuth} className="btn-primary text-sm">
                  {t('nav.signIn')}
                </button>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-marble-800 sm:hidden"
              aria-label={t('nav.menu')}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(20rem,85vw)] bg-marble-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-gradient">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-marble-800"
                aria-label={t('common.close')}
              >
                <X size={22} />
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-all ${
                      active
                        ? 'bg-marble-800 text-white shadow-glow-gold'
                        : 'text-ink-muted hover:bg-marble-800/60 hover:text-ink'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-ink-muted transition-all hover:bg-marble-800/60 hover:text-red-400"
                >
                  <span className="h-4 w-4" />
                  {t('nav.signOut')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="btn-primary mt-2 text-sm"
                >
                  {t('nav.signIn')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-8">{children}</main>
    </div>
  );
}
