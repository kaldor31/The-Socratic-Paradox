import { useState } from 'react';
import { ArrowLeft, Globe, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import type { Language } from '../i18n/translations';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Language>(language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateLanguage(selected);
      setLanguage(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
        <h2 className="font-serif text-3xl font-bold">{t('settings.title')}</h2>
      </div>

      <div className="panel">
        <div className="mb-6 flex items-center gap-3">
          <Globe className="text-accent-gold" size={24} />
          <h3 className="font-serif text-xl font-semibold">{t('settings.language')}</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(['en', 'ru'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setSelected(lang)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                selected === lang
                  ? 'border-accent-gold bg-accent-gold/10'
                  : 'border-marble-700 bg-marble-900/50 hover:border-marble-600'
              }`}
            >
              <span className="font-medium">{lang === 'en' ? 'English' : 'Русский'}</span>
              {selected === lang && <Check size={18} className="text-accent-gold" />}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{error}</div>}
        {saved && <div className="mt-4 rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-accent-gold">Saved</div>}

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving || selected === language} className="btn-primary disabled:opacity-50">
            {saving ? t('common.loading') : t('settings.save')}
          </button>
        </div>
      </div>

      {user?.email && (
        <div className="panel">
          <h3 className="font-serif text-xl font-semibold">{t('settings.email')}</h3>
          <p className="mt-2 text-ink-muted">{user.email}</p>
        </div>
      )}
    </div>
  );
}
