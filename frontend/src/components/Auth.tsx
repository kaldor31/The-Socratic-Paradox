import { useState } from 'react';
import { Mail, Lock, User, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';

interface AuthProps {
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export function Auth({ onClose }: AuthProps) {
  const { t } = useLanguage();
  const { login, register, verify, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
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
      await login({ email, password });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      await register({ email, password, handle });
      setMode('verify');
      setMessage(t('auth.verificationSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      await verify({ email, code });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
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
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      await resetPassword({ email, token: code, newPassword });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
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

      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          {input(<Mail size={18} />, { type: 'email', placeholder: t('auth.email'), value: email, onChange: e => setEmail(e.target.value), required: true })}
          {input(<Lock size={18} />, { type: 'password', placeholder: t('auth.password'), value: password, onChange: e => setPassword(e.target.value), required: true })}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? t('common.loading') : t('auth.signIn')}
          </button>
          <div className="flex justify-between text-sm">
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
          {input(<User size={18} />, { type: 'text', placeholder: t('auth.handle'), value: handle, onChange: e => setHandle(e.target.value) })}
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
