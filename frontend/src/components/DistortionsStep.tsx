import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { DistortionOption } from '../state/types';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { tDynamic } from '../i18n/translations';

interface DistortionsStepProps {
  distortions: DistortionOption[];
  onChange: (distortion: DistortionOption) => void;
  onSubmit: () => void;
  canAdvance: boolean;
}

export function DistortionsStep({ distortions, onChange, onSubmit, canAdvance }: DistortionsStepProps) {
  const { t, language } = useLanguage();
  const [allDistortions, setAllDistortions] = useState<DistortionOption[]>([]);

  useEffect(() => {
    api.getDistortions()
      .then(res => setAllDistortions(res.distortions))
      .catch(() => {});
  }, []);

  const merged = allDistortions.map(d => {
    const selected = distortions.find(s => s.id === d.id);
    return selected ? { ...selected } : { ...d, confidence: 0, evidence: '' };
  });

  const updateConfidence = (d: DistortionOption, confidence: number) => {
    onChange({ ...d, confidence: Math.min(100, Math.max(0, confidence)) });
  };

  const updateEvidence = (d: DistortionOption, evidence: string) => {
    onChange({ ...d, evidence });
  };

  return (
    <div className="panel">
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('wizard.distortionsTitle')}</h2>
      <p className="mt-2 text-ink-muted">{t('wizard.distortionsHint')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {merged.map(d => (
          <div
            key={d.id}
            className={`rounded-xl border p-4 transition-all ${
              d.confidence > 0 ? 'border-accent-gold/50 bg-marble-800' : 'border-marble-700 bg-marble-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full shadow-glow-gold"
                style={{ backgroundColor: d.colorAccent }}
              />
              <h3 className="font-serif text-lg font-semibold">{tDynamic(`distortions.${d.slug}.label`, language) ?? d.label}</h3>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{tDynamic(`distortions.${d.slug}.description`, language) ?? d.description}</p>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-ink-dim">{t('wizard.confidence')}</label>
                <span className="text-sm font-bold text-accent-gold">{d.confidence}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={d.confidence}
                onChange={e => updateConfidence(d, Number(e.target.value))}
                className="mt-2 w-full accent-accent-gold"
              />
            </div>

            {d.confidence > 0 && (
              <textarea
                value={d.evidence}
                onChange={e => updateEvidence(d, e.target.value)}
                placeholder={t('wizard.evidencePlaceholder')}
                className="input-field mt-4 min-h-[80px]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink-dim">
          <AlertTriangle size={16} />
          <span>{t('wizard.distortionsRequired')}</span>
        </div>
        <button onClick={onSubmit} disabled={!canAdvance} className="btn-primary disabled:opacity-50">
          {t('wizard.continue')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
