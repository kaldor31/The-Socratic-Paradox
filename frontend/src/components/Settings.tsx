import { useState } from 'react';
import { Globe, Check, Pencil, X, User, Mail, Lock, KeyRound, Sun, Moon, Palette, RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import type { CustomColors } from '../theme/ThemeContext';
import { api } from '../api/client';
import type { Language } from '../i18n/translations';

const colorKeys: (keyof CustomColors)[] = [
  'bg', 'surface', 'surface2', 'border', 'accent', 'accentRust', 'accentPatina', 'accentBronze', 'text', 'textMuted', 'textDim', 'parchment', 'parchmentDark', 'canvasBg',
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-marble-700 bg-marble-900/50 p-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer appearance-none overflow-hidden rounded-lg border border-marble-600 bg-transparent p-0"
          aria-label={label}
        />
        <span className="font-mono text-xs text-ink-muted">{value}</span>
      </div>
    </label>
  );
}

export function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user, setUser } = useAuth();
  const { theme, setTheme, customColors, setCustomColors, resetCustomColors } = useTheme();
  const [langError, setLangError] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<null | 'handle' | 'email'>(null);

  const [handleDraft, setHandleDraft] = useState(user?.handle || '');
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleSaved, setHandleSaved] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);

  const [emailStep, setEmailStep] = useState<'password' | 'code'>('password');
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleChangeLanguage = async (lang: Language) => {
    if (lang === language) return;
    setLangError(null);
    try {
      await api.updateLanguage(lang);
      setLanguage(lang);
    } catch (err) {
      setLangError(err instanceof Error ? err.message : t('error.failedToSave'));
    }
  };

  const handleSaveHandle = async () => {
    const trimmed = handleDraft.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      setHandleError(t('settings.invalidHandle'));
      return;
    }
    setHandleSaving(true);
    setHandleError(null);
    setHandleSaved(false);
    try {
      const res = await api.updateHandle({ handle: trimmed });
      setUser(res.user);
      setHandleSaved(true);
      setTimeout(() => {
        setHandleSaved(false);
        setEditingField(null);
      }, 1500);
    } catch (err) {
      setHandleError(err instanceof Error ? err.message : t('error.failedToSave'));
    } finally {
      setHandleSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!emailPassword || !newEmail) return;
    setEmailLoading(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const res = await api.requestEmailChange({ password: emailPassword, newEmail });
      setEmailMessage(res.message);
      setEmailStep('code');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('error.failedToSave'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!newEmail || !emailCode) return;
    setEmailLoading(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const res = await api.confirmEmailChange({ newEmail, code: emailCode });
      setUser(res.user);
      setEmailMessage(t('settings.emailChanged'));
      setEmailPassword('');
      setNewEmail('');
      setEmailCode('');
      setEmailStep('password');
      setTimeout(() => {
        setEmailMessage(null);
        setEditingField(null);
      }, 2000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('error.failedToSave'));
    } finally {
      setEmailLoading(false);
    }
  };

  const startEditingHandle = () => {
    setHandleDraft(user?.handle || '');
    setHandleError(null);
    setHandleSaved(false);
    setEditingField('handle');
  };

  const startEditingEmail = () => {
    setEmailPassword('');
    setNewEmail('');
    setEmailCode('');
    setEmailStep('password');
    setEmailError(null);
    setEmailMessage(null);
    setEditingField('email');
  };

  const cancelEditing = () => setEditingField(null);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('settings.title')}</h2>

      <div className="panel">
        <div className="mb-6 flex items-center gap-3">
          {theme === 'light' ? <Sun className="text-accent-gold" size={24} /> : theme === 'dark' ? <Moon className="text-accent-gold" size={24} /> : <Palette className="text-accent-gold" size={24} />}
          <h3 className="font-serif text-xl font-semibold">{t('settings.theme')}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              theme === 'dark'
                ? 'border-accent-gold bg-accent-gold/10'
                : 'border-marble-700 bg-marble-900/50 hover:border-marble-600'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <Moon size={18} /> {t('settings.darkTheme')}
            </span>
            {theme === 'dark' && <Check size={18} className="text-accent-gold" />}
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              theme === 'light'
                ? 'border-accent-gold bg-accent-gold/10'
                : 'border-marble-700 bg-marble-900/50 hover:border-marble-600'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <Sun size={18} /> {t('settings.lightTheme')}
            </span>
            {theme === 'light' && <Check size={18} className="text-accent-gold" />}
          </button>
          <button
            onClick={() => setTheme('custom')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              theme === 'custom'
                ? 'border-accent-gold bg-accent-gold/10'
                : 'border-marble-700 bg-marble-900/50 hover:border-marble-600'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <Palette size={18} /> {t('settings.customTheme')}
            </span>
            {theme === 'custom' && <Check size={18} className="text-accent-gold" />}
          </button>
        </div>

        {theme === 'custom' && (
          <div className="mt-6 animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-serif text-lg font-semibold">{t('settings.customThemeTitle')}</h4>
              <button onClick={resetCustomColors} className="btn-secondary text-sm">
                <RotateCcw size={16} />
                {t('settings.resetColors')}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {colorKeys.map(key => (
                <ColorField
                  key={key}
                  label={t(`settings.colors.${key}`)}
                  value={customColors[key]}
                  onChange={value => setCustomColors({ ...customColors, [key]: value })}
                />
              ))}
            </div>
          </div>
        )}
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
              onClick={() => handleChangeLanguage(lang)}
              disabled={language === lang}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === lang
                  ? 'border-accent-gold bg-accent-gold/10'
                  : 'border-marble-700 bg-marble-900/50 hover:border-marble-600 disabled:opacity-50'
              }`}
            >
              <span className="font-medium">{lang === 'en' ? 'English' : 'Русский'}</span>
              {language === lang && <Check size={18} className="text-accent-gold" />}
            </button>
          ))}
        </div>

        {langError && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{langError}</div>}
      </div>

      <div className="panel">
        <h3 className="font-serif text-xl font-semibold">{t('settings.account')}</h3>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-marble-700 bg-marble-900/50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Mail size={18} className="text-accent-gold" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-ink-dim">{t('settings.email')}</p>
              <p className="truncate font-medium text-ink">{user?.email || '—'}</p>
            </div>
          </div>
          <button onClick={startEditingEmail} className="shrink-0 rounded-lg p-2 text-ink-dim hover:bg-marble-800 hover:text-ink" aria-label={t('settings.changeEmail')}>
            <Pencil size={18} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-marble-700 bg-marble-900/50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <User size={18} className="text-accent-gold" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-ink-dim">{t('settings.nickname')}</p>
              <p className="truncate font-medium text-ink">{user?.handle || '—'}</p>
            </div>
          </div>
          <button onClick={startEditingHandle} className="shrink-0 rounded-lg p-2 text-ink-dim hover:bg-marble-800 hover:text-ink" aria-label={t('settings.changeNickname')}>
            <Pencil size={18} />
          </button>
        </div>

        {editingField === 'handle' && (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={handleDraft}
              onChange={e => setHandleDraft(e.target.value)}
              placeholder={t('settings.nickname')}
              className="input-field"
              maxLength={32}
            />
            {handleError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{handleError}</div>}
            {handleSaved && <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-accent-gold">{t('settings.nicknameChanged')}</div>}
            <div className="flex gap-2">
              <button onClick={handleSaveHandle} disabled={handleSaving} className="btn-primary flex-1 disabled:opacity-50">
                {handleSaving ? t('common.loading') : t('common.save')}
              </button>
              <button onClick={cancelEditing} className="btn-secondary">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {editingField === 'email' && (
          <div className="mt-4 space-y-3">
            {emailStep === 'password' && (
              <>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    placeholder={t('settings.password')}
                    className="input-field w-full pl-10"
                  />
                </div>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder={t('settings.newEmail')}
                    className="input-field w-full pl-10"
                  />
                </div>
              </>
            )}
            {emailStep === 'code' && (
              <>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                  <input
                    type="text"
                    value={emailCode}
                    onChange={e => setEmailCode(e.target.value)}
                    placeholder={t('settings.verificationCode')}
                    className="input-field w-full pl-10"
                    maxLength={6}
                  />
                </div>
                <p className="text-sm text-ink-muted">
                  {t('settings.emailCodeSent')} {newEmail}
                </p>
              </>
            )}
            {emailError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{emailError}</div>}
            {emailMessage && <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-accent-gold">{emailMessage}</div>}
            <div className="flex gap-2">
              {emailStep === 'password' ? (
                <button
                  onClick={handleRequestEmailChange}
                  disabled={emailLoading || !emailPassword || !newEmail}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {emailLoading ? t('common.loading') : t('settings.sendCode')}
                </button>
              ) : (
                <button
                  onClick={handleConfirmEmailChange}
                  disabled={emailLoading || !emailCode}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {emailLoading ? t('common.loading') : t('settings.confirmEmail')}
                </button>
              )}
              <button onClick={cancelEditing} className="btn-secondary">
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
