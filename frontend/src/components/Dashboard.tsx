import { useEffect, useState } from 'react';
import { Plus, BookOpen, Heart, TrendingUp } from 'lucide-react';
import type { DashboardMetric } from '../state/types';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { tDynamic } from '../i18n/translations';

interface DashboardProps {
  onNewEntry: () => void;
  onEntries: () => void;
}

export function Dashboard({ onNewEntry, onEntries }: DashboardProps) {
  const { t, language } = useLanguage();
  const [metrics, setMetrics] = useState<DashboardMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard()
      .then(res => setMetrics(res.metrics))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="panel text-center text-red-200">
        {error || t('common.error')}
      </div>
    );
  }

  const statCards = [
    { label: t('dashboard.total'), value: metrics.totalSessions, icon: BookOpen },
    { label: t('dashboard.completed'), value: metrics.completedSessions, icon: TrendingUp },
    { label: t('dashboard.favorites'), value: metrics.favoriteSessions, icon: Heart },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t('dashboard.title')}</h2>
          <p className="mt-1 text-sm text-ink-muted sm:text-base">{t('dashboard.subtitle')}</p>
        </div>
        <button onClick={onNewEntry} className="btn-primary self-start">
          <Plus size={18} />
          {t('dashboard.newSession')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="panel">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marble-700 text-accent-gold">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm text-ink-muted">{card.label}</p>
                  <p className="font-serif text-3xl font-bold text-ink">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="panel">
          <p className="text-sm text-ink-muted">{t('dashboard.topDistortion')}</p>
          <p className="mt-1 font-serif text-xl font-bold text-accent-patina">
            {metrics.topDistortion
              ? tDynamic(`distortions.${metrics.topDistortion.slug}.label`, language) ?? metrics.topDistortion.label
              : '—'}
          </p>
          {metrics.topDistortion && (
            <p className="text-xs text-ink-dim">{metrics.topDistortion.count} {t('dashboard.occurrences')}</p>
          )}
        </div>
      </div>

      <div className="panel">
        <h3 className="font-serif text-xl font-semibold">{t('dashboard.sessionsByMonth')}</h3>
        {metrics.sessionsByMonth.length === 0 ? (
          <p className="mt-4 text-ink-muted">{t('dashboard.noSessions')}</p>
        ) : (
          <div className="mt-6 space-y-3">
            {metrics.sessionsByMonth.map(m => (
              <div key={m.month} className="flex items-center gap-4">
                <span className="w-20 text-sm text-ink-muted">{m.month}</span>
                <div className="flex-1 rounded-full bg-marble-700">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-accent-rust to-accent-gold"
                    style={{ width: `${Math.min(100, m.count * 10)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-ink">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button onClick={onEntries} className="btn-secondary">
          <BookOpen size={18} />
          {t('dashboard.browseAll')}
        </button>
      </div>
    </div>
  );
}
