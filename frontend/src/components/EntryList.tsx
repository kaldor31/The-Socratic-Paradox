import { useEffect, useState } from 'react';
import { Calendar, Heart, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { EncryptedEntry } from '../api/client';
import { useCrypto } from '../auth/useCrypto';
import { useLanguage } from '../i18n/LanguageContext';
import { useConfirm } from './ConfirmDialog';
import { tDynamic } from '../i18n/translations';

interface EntryView {
  id: string;
  thesis: string;
  status: EncryptedEntry['status'];
  isFavorite: boolean;
  createdAt: string;
}

interface EntryListProps {
  onResume: (entryId: string) => void;
}

export function EntryList({ onResume }: EntryListProps) {
  const { t, language } = useLanguage();
  const { decrypt } = useCrypto();
  const [entries, setEntries] = useState<EntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getEntries()
      .then(async res => {
        const views = await Promise.all(
          res.entries.map(async entry => ({
            id: entry.id,
            thesis: entry.thesis ? await decrypt(entry.thesis) : '',
            status: entry.status,
            isFavorite: entry.isFavorite,
            createdAt: entry.createdAt,
          }))
        );
        setEntries(views);
      })
      .catch(err => setError(err instanceof Error ? err.message : t('error.failedToLoadEntries')))
      .finally(() => setLoading(false));
  }, [decrypt, t]);

  const confirm = useConfirm();

  const handleDelete = async (entryId: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      message: t('entries.deleteConfirm'),
      isDanger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
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
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('entries.title')}</h2>

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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-dim sm:gap-4">
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
