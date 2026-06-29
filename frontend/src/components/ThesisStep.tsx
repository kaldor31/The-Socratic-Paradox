import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ThesisStepProps {
  thesis: string;
  onChange: (thesis: string) => void;
  onSubmit: (thesis: string) => void;
}

export function ThesisStep({ thesis, onChange, onSubmit }: ThesisStepProps) {
  const { t } = useLanguage();
  const isValid = thesis.trim().length >= 3;

  return (
    <div className="panel">
      <h2 className="font-serif text-3xl font-bold">{t('wizard.thesisTitle')}</h2>
      <p className="mt-2 text-ink-muted">{t('wizard.thesisHint')}</p>

      <textarea
        value={thesis}
        onChange={e => onChange(e.target.value)}
        placeholder={t('wizard.thesisPlaceholder')}
        className="input-field mt-6 min-h-[160px] resize-y font-serif text-lg"
      />

      <div className="mt-6 flex items-center justify-between">
        <span className={`text-sm ${isValid ? 'text-accent-gold' : 'text-ink-dim'}`}>
          {thesis.trim().length}/2000
        </span>
        <button onClick={() => onSubmit(thesis)} disabled={!isValid} className="btn-primary disabled:opacity-50">
          {t('wizard.continue')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
