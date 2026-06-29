import { Check, ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { JournalCanvas, JournalCanvasRef } from './JournalCanvas';

interface SynthesisStepProps {
  entryId: string;
  synthesis: string;
  drawing?: string;
  thesis: string;
  onChange: (synthesis: string) => void;
  onSubmit: (synthesis: string, drawing?: string) => void;
  canAdvance: boolean;
}

export function SynthesisStep({ entryId, synthesis, drawing, thesis, onChange, onSubmit, canAdvance }: SynthesisStepProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<JournalCanvasRef>(null);

  const handleSubmit = () => {
    const canvasDrawing = canvasRef.current?.hasDrawing() ? canvasRef.current.getDataUrl() : undefined;
    onSubmit(synthesis, canvasDrawing);
  };

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

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium text-ink-muted">{t('wizard.synthesisCanvasHint')}</p>
        <JournalCanvas
          ref={canvasRef}
          initialDrawing={drawing}
          storageKey={entryId ? `sp-synthesis-drawing-${entryId}` : undefined}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} disabled={!canAdvance} className="btn-primary disabled:opacity-50">
          <Check size={18} />
          {t('wizard.complete')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
