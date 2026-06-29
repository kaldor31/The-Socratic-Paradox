import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Heart, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { Entry } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { tDynamic } from '../i18n/translations';

interface EntryListProps {
  onBack: () => void;
  onResume: (entryId: string) => void;
}

export function EntryList({ onBack, onResume }: EntryListProps) {
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getEntries()
      .then(res => setEntries(res.entries))
      .catch(err => setError(err instanceof Error ? err.message : t('error.failedToLoadEntries')))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (entryId: string) => {
    if (!confirm(t('entries.deleteConfirm'))) return;
    setDeletingId(entryId);
    try {
      await api.deleteEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToDeleteEntry'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="panel flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel text-center text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          {t('common.backToDashboard')}
        </button>
        <h2 className="font-serif text-3xl font-bold">{t('entries.title')}</h2>
      </div>

      {entries.length === 0 ? (
        <div className="panel text-center py-16">
          <p className="text-ink-muted">{t('entries.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map(entry => (
            <div key={entry.id} className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-lg font-semibold text-ink line-clamp-1">
                    {entry.thesis}
                  </h3>
                  {entry.isFavorite && <Heart size={16} className="fill-accent-patina text-accent-patina" />}
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-ink-dim">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(entry.createdAt).toLocaleDateString(language)}
                  </span>
                  <span className="rounded-full bg-marble-700 px-2 py-0.5 text-xs capitalize">
                    {tDynamic(`entry.status.${entry.status}`, language) ?? entry.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onResume(entry.id)} className="btn-secondary text-xs">
                  {t('entries.resume')}
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
