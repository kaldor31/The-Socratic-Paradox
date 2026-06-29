import { Check, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SynthesisStepProps {
  synthesis: string;
  thesis: string;
  onChange: (synthesis: string) => void;
  onSubmit: (synthesis: string) => void;
  canAdvance: boolean;
}

export function SynthesisStep({ synthesis, thesis, onChange, onSubmit, canAdvance }: SynthesisStepProps) {
  const { t } = useLanguage();

  return (
    <div className="panel">
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('wizard.synthesisTitle')}</h2>
      <p className="mt-2 text-ink-muted">{t('wizard.synthesisHint')}</p>

      <div className="mt-6 rounded-xl border border-marble-700 bg-marble-900/50 p-4">
        <p className="text-xs uppercase tracking-wider text-ink-dim">{t('wizard.originalThesis')}</p>
        <p className="mt-1 font-serif italic text-ink-muted">{thesis}</p>
      </div>

      <textarea
        value={synthesis}
        onChange={e => onChange(e.target.value)}
        placeholder={t('wizard.synthesisPlaceholder')}
        className="input-field mt-6 min-h-[180px] font-serif text-lg"
      />

      <div className="mt-6 flex justify-end">
        <button onClick={() => onSubmit(synthesis)} disabled={!canAdvance} className="btn-primary disabled:opacity-50">
          <Check size={18} />
          {t('wizard.complete')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
