import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-marble-700 bg-marble-900 p-6 shadow-xl">
            <h3 className="font-serif text-xl font-bold">{state.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{state.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={handleCancel} className="btn-secondary">
                {state.cancelLabel ?? t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className={`btn-primary ${state.isDanger ? '!bg-red-500 !border-red-500 hover:!bg-red-400' : ''}`}
              >
                {state.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
