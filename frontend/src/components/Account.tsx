import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Trash2, User, Settings, LogOut } from 'lucide-react';
import { api, type Entry } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

interface AccountProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

export function Account({ onBack, onOpenSettings }: AccountProps) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getEntries()
      .then(res => setEntries(res.entries))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load entries'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (entryId: string) => {
    if (!confirm(t('entries.deleteConfirm'))) return;
    setDeletingId(entryId);
    try {
      await api.deleteEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete all sessions? This cannot be undone.')) return;
    try {
      await Promise.all(entries.map(e => api.deleteEntry(e.id)));
      setEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entries');
    }
  };

  if (!user) {
    return (
      <div className="panel text-center">
        <p className="text-ink-muted">Not signed in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
        <h2 className="font-serif text-3xl font-bold">{t('account.title')}</h2>
      </div>

      <div className="panel">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-gold/20 text-accent-gold">
            <User size={28} />
          </div>
          <div>
            <p className="font-serif text-xl font-semibold">{user.handle || user.email || t('account.anonymous')}</p>
            <p className="text-sm text-ink-dim">{user.email}</p>
            <p className="text-xs text-ink-dim">{t('account.since')}: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onOpenSettings} className="btn-secondary">
            <Settings size={18} />
            {t('account.settings')}
          </button>
          <button onClick={logout} className="btn-secondary text-red-400 hover:bg-red-500/10">
            <LogOut size={18} />
            {t('nav.signOut')}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold">{t('account.sessions')}</h3>
          {entries.length > 0 && (
            <button onClick={handleDeleteAll} className="btn-secondary text-xs text-red-400 hover:bg-red-500/10">
              <Trash2 size={14} />
              {t('account.deleteAll')}
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
          </div>
        )}

        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{error}</div>}

        {!loading && entries.length === 0 && (
          <p className="text-ink-muted">{t('entries.empty')}</p>
        )}

        <div className="grid gap-3">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between rounded-xl border border-marble-700 bg-marble-900/50 p-4">
              <div>
                <p className="font-serif font-semibold line-clamp-1">{entry.thesis}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-dim">
                  <Calendar size={12} />
                  {new Date(entry.createdAt).toLocaleDateString()}
                  <span className="rounded-full bg-marble-700 px-2 py-0.5 capitalize">{entry.status}</span>
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
