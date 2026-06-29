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
import { useAuth } from './auth/AuthContext';

type View = 'onboarding' | 'quotes' | 'wizard' | 'dashboard' | 'entries' | 'journal' | 'account' | 'settings' | 'auth';

const protectedViews: View[] = ['wizard', 'dashboard', 'entries', 'journal', 'account', 'settings', 'quotes'];

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [view, setView] = useState<View>(isAuthenticated ? 'journal' : 'onboarding');
  const [showAuth, setShowAuth] = useState(false);
  const [resumeEntryId, setResumeEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (showAuth) {
      setView('auth');
    }
  }, [showAuth]);

  useEffect(() => {
    if (!isLoading) {
      setView(isAuthenticated ? 'journal' : 'onboarding');
    }
  }, [isLoading, isAuthenticated]);

  const handleNavigate = (newView: View) => {
    if (!isAuthenticated && protectedViews.includes(newView)) {
      setShowAuth(true);
      return;
    }
    if (newView !== 'auth') setShowAuth(false);
    if (newView === 'wizard') setResumeEntryId(null);
    setView(newView);
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
    setView(user ? 'journal' : 'onboarding');
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
          onFinish={() => setView('dashboard')}
        />
      )}
      {view === 'dashboard' && user && (
        <Dashboard onNewEntry={() => { setResumeEntryId(null); setView('wizard'); }} onEntries={() => setView('entries')} />
      )}
      {view === 'entries' && user && (
        <EntryList onResume={(entryId) => { setResumeEntryId(entryId); setView('wizard'); }} />
      )}
      {view === 'journal' && user && (
        <Journal />
      )}
      {view === 'auth' && <Auth onClose={handleCloseAuth} />}
      {view === 'account' && user && <Account onOpenSettings={() => setView('settings')} />}
      {view === 'settings' && user && <Settings />}
    </Layout>
  );
}

export default App;
