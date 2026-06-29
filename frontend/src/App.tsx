import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Wizard } from './components/Wizard';
import { Dashboard } from './components/Dashboard';
import { EntryList } from './components/EntryList';
import { Auth } from './components/Auth';
import { Account } from './components/Account';
import { Settings } from './components/Settings';
import { Journal } from './components/Journal';
import { Quotes } from './components/Quotes';
import { EntryDetail } from './components/EntryDetail';
import { useAuth } from './auth/AuthContext';
import { useEncryption } from './auth/EncryptionContext';

type View = 'onboarding' | 'quotes' | 'wizard' | 'dashboard' | 'entries' | 'journal' | 'account' | 'settings' | 'auth' | 'entryDetail';

const protectedViews: View[] = ['wizard', 'dashboard', 'entries', 'journal', 'account', 'settings', 'quotes'];

const LAST_VIEW_KEY = 'sp-last-view';

function getValidView(isAuthenticated: boolean, stored: View | null): View {
  if (isAuthenticated) {
    return stored && protectedViews.includes(stored) ? stored : 'journal';
  }
  return stored === 'onboarding' ? 'onboarding' : 'onboarding';
}

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { isUnlocked, isLoading: encryptionLoading } = useEncryption();
  const [view, setView] = useState<View>(isAuthenticated ? 'journal' : 'onboarding');
  const [showAuth, setShowAuth] = useState(false);
  const [resumeEntryId, setResumeEntryId] = useState<string | null>(null);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (showAuth) {
      setView('auth');
    }
  }, [showAuth]);

  useEffect(() => {
    if (!isLoading) {
      const stored = localStorage.getItem(LAST_VIEW_KEY) as View | null;
      setView(getValidView(isAuthenticated, stored));
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    console.log('[app] auth state', { isLoading, encryptionLoading, isAuthenticated, isUnlocked });
    if (!isLoading && !encryptionLoading && isAuthenticated && !isUnlocked) {
      console.log('[app] showing auth modal because key is locked');
      setShowAuth(true);
    }
  }, [isLoading, encryptionLoading, isAuthenticated, isUnlocked]);

  const setStoredView = (newView: View) => {
    setView(newView);
    if (newView !== 'auth') {
      localStorage.setItem(LAST_VIEW_KEY, newView);
    }
  };

  const handleNavigate = (newView: View) => {
    if (!isAuthenticated && protectedViews.includes(newView)) {
      setStoredView(newView);
      setShowAuth(true);
      return;
    }
    if (newView !== 'auth') setShowAuth(false);
    if (newView === 'wizard') setResumeEntryId(null);
    setStoredView(newView);
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
    const stored = localStorage.getItem(LAST_VIEW_KEY) as View | null;
    setStoredView(user ? getValidView(true, stored) : 'onboarding');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-marble-midnight text-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <Layout activeView={view} onNavigate={handleNavigate} onOpenAuth={() => setShowAuth(true)}>
      <div key={view} className="animate-fade-in-up">
      {view === 'onboarding' && (
        <Onboarding onStart={() => {
          setResumeEntryId(null);
          if (isAuthenticated) setView('wizard');
          else setShowAuth(true);
        }} />
      )}
      {view === 'quotes' && user && <Quotes />}
      {view === 'wizard' && user && (
        <Wizard
          entryId={resumeEntryId ?? undefined}
          onFinish={(entryId) => {
            setViewingEntryId(entryId);
            setView('entryDetail');
          }}
        />
      )}
      {view === 'dashboard' && user && (
        <Dashboard onNewEntry={() => { setResumeEntryId(null); setView('wizard'); }} onEntries={() => setView('entries')} />
      )}
      {view === 'entries' && user && (
        <EntryList
          onResume={(entryId) => { setResumeEntryId(entryId); setView('wizard'); }}
          onView={(entryId) => { setViewingEntryId(entryId); setView('entryDetail'); }}
        />
      )}
      {view === 'entryDetail' && viewingEntryId && user && (
        <EntryDetail
          entryId={viewingEntryId}
          onBack={() => { setViewingEntryId(null); setView('entries'); }}
          onEdit={(entryId) => { setResumeEntryId(entryId); setView('wizard'); }}
        />
      )}
      {view === 'journal' && user && (
        <Journal />
      )}
      {view === 'auth' && <Auth onClose={handleCloseAuth} />}
      {view === 'account' && user && <Account onOpenSettings={() => setView('settings')} />}
      {view === 'settings' && user && <Settings />}
      </div>
    </Layout>
  );
}

export default App;
