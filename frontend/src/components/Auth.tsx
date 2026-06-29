import { useState, useEffect } from 'react';
import { Mail, Lock, User, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useEncryption } from '../auth/EncryptionContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { generateSalt, deriveKey, generateDataKey, encryptKey, decryptKey } from '../utils/crypto';

interface AuthProps {
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export function Auth({ onClose }: AuthProps) {
  const { t } = useLanguage();
  const { user, login, register, verify, resetPassword } = useAuth();
  const { isUnlocked, unlock } = useEncryption();
  const needsUnlock = !!user && !isUnlocked;
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (needsUnlock && user?.email) {
      setEmail(user.email);
    }
  }, [needsUnlock, user?.email]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError(null);
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const user = await login({ email, password });
      await unlock(password, user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const salt = generateSalt();
      const kek = await deriveKey(password, salt);
      const dek = await generateDataKey();
      const encryptedDataKey = await encryptKey(dek, kek);
      await register({ email, password, handle, encryptionSalt: salt, encryptedDataKey });
      setMode('verify');
      setMessage(t('auth.verificationSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const user = await verify({ email, code });
      await unlock(password, user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      await api.forgotPassword({ email });
      setMode('reset');
      setMessage(t('auth.resetSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.sendResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const { encryptionSalt, encryptedDataKey } = await api.getKey(email);
      if (!encryptionSalt || !encryptedDataKey) throw new Error('No encryption key material');
      const tokenKek = await deriveKey(code, encryptionSalt);
      const dek = await decryptKey(encryptedDataKey, tokenKek);
      const newKek = await deriveKey(newPassword, encryptionSalt);
      const newEncryptedDataKey = await encryptKey(dek, newKek);
      const user = await resetPassword({ email, token: code, newPassword, encryptedDataKey: newEncryptedDataKey });
      await unlock(newPassword, user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const input = (icon: React.ReactNode, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim">{icon}</span>
      <input className="input-field w-full pl-10" {...props} />
    </div>
  );

  return (
    <div className="panel mx-auto max-w-md">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onClose} className="text-ink-dim hover:text-ink">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-serif text-2xl font-bold">
          {mode === 'login' && t('auth.signIn')}
          {mode === 'register' && t('auth.signUp')}
          {mode === 'verify' && t('auth.verifyTitle')}
          {mode === 'forgot' && t('auth.resetPassword')}
          {mode === 'reset' && t('auth.resetPassword')}
        </h2>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">{error}</div>}
      {message && <div className="mb-4 rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-accent-gold">{message}</div>}

      {needsUnlock && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-accent-gold">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>Your encryption key is locked. Please sign in again to unlock your data.</span>
        </div>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          {input(<Mail size={18} />, { type: 'email', placeholder: t('auth.email'), value: email, onChange: e => setEmail(e.target.value), required: true })}
          {input(<Lock size={18} />, { type: 'password', placeholder: t('auth.password'), value: password, onChange: e => setPassword(e.target.value), required: true })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.signIn')}
          </button>
          <div className="flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
            <button type="button" onClick={() => { reset(); setMode('register'); }} className="text-accent-gold hover:underline">
              {t('auth.noAccount')}
            </button>
            <button type="button" onClick={() => { reset(); setMode('forgot'); }} className="text-ink-dim hover:text-ink">
              {t('auth.forgotPassword')}
            </button>
          </div>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          {input(<Mail size={18} />, { type: 'email', placeholder: t('auth.email'), value: email, onChange: e => setEmail(e.target.value), required: true })}
          {input(<User size={18} />, { type: 'text', placeholder: t('auth.handle'), value: handle, onChange: e => setHandle(e.target.value), required: true, minLength: 3, maxLength: 32 })}
          {input(<Lock size={18} />, { type: 'password', placeholder: t('auth.password'), value: password, onChange: e => setPassword(e.target.value), required: true, minLength: 8 })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.signUp')}
          </button>
          <button type="button" onClick={() => { reset(); setMode('login'); }} className="text-sm text-accent-gold hover:underline">
            {t('auth.hasAccount')}
          </button>
        </form>
      )}

      {mode === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-4">
          {input(<KeyRound size={18} />, { type: 'text', placeholder: t('auth.verifyCode'), value: code, onChange: e => setCode(e.target.value), required: true, maxLength: 6 })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.verify')}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-4">
          {input(<Mail size={18} />, { type: 'email', placeholder: t('auth.email'), value: email, onChange: e => setEmail(e.target.value), required: true })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.sendCode')}
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4">
          {input(<KeyRound size={18} />, { type: 'text', placeholder: t('auth.resetCode'), value: code, onChange: e => setCode(e.target.value), required: true, maxLength: 64 })}
          {input(<Lock size={18} />, { type: 'password', placeholder: t('auth.newPassword'), value: newPassword, onChange: e => setNewPassword(e.target.value), required: true, minLength: 8 })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.resetPassword')}
          </button>
        </form>
      )}
    </div>
  );
}
