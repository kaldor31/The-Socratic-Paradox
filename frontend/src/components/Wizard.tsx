import { useReducer, useCallback, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { wizardReducer, initialWizardState, WizardActions, canAdvance } from '../state/wizardMachine';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { ThesisStep } from './ThesisStep';
import { InterrogationStep } from './InterrogationStep';
import { DistortionsStep } from './DistortionsStep';
import { SynthesisStep } from './SynthesisStep';

interface WizardProps {
  entryId?: string;
  onFinish: () => void;
  onBack: () => void;
}

export function Wizard({ entryId, onFinish, onBack }: WizardProps) {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  useEffect(() => {
    if (!entryId) return;
    dispatch(WizardActions.setLoading(true));
    api.getSession(entryId)
      .then(({ session }) => {
        dispatch(WizardActions.initSession({ ...session, synthesis: session.synthesis || '' }));
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : t('common.error');
        dispatch(WizardActions.setError(message));
      })
      .finally(() => dispatch(WizardActions.setLoading(false)));
  }, [entryId, t]);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : t('common.error');
    dispatch(WizardActions.setError(message));
  }, [t]);

  const handleThesisSubmit = async (thesis: string) => {
    if (state.session.entryId) {
      dispatch(WizardActions.setStep('interrogation'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      const { session } = await api.createSession({ thesis });
      dispatch(WizardActions.advanceToInterrogation(session));
    } catch (err) {
      handleError(err);
    }
  };

  const handleInterrogationSubmit = async () => {
    if (state.session.status === 'distortions' || state.session.status === 'synthesis') {
      dispatch(WizardActions.setStep('distortions'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      const { session } = await api.submitInterrogation({
        entryId: state.session.entryId,
        answers: state.session.answers,
      });
      dispatch(WizardActions.advanceToDistortions(session));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDistortionsSubmit = async () => {
    if (state.session.status === 'synthesis') {
      dispatch(WizardActions.setStep('synthesis'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      const { session } = await api.submitDistortions({
        entryId: state.session.entryId,
        distortions: state.session.distortions.map(d => ({
          distortionId: d.id,
          confidence: d.confidence,
          evidence: d.evidence,
        })),
      });
      dispatch(WizardActions.complete(session));
    } catch (err) {
      handleError(err);
    }
  };

  const handleSynthesisSubmit = async (synthesis: string) => {
    dispatch(WizardActions.setLoading(true));
    try {
      await api.submitSynthesis({
        entryId: state.session.entryId,
        synthesis,
      });
      dispatch(WizardActions.complete({ ...state.session, synthesis }));
      onFinish();
    } catch (err) {
      handleError(err);
    }
  };

  const steps = [
    { id: 'thesis', label: t('wizard.thesis') },
    { id: 'interrogation', label: t('wizard.interrogation') },
    { id: 'distortions', label: t('wizard.distortions') },
    { id: 'synthesis', label: t('wizard.synthesis') },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => dispatch(WizardActions.setStep(s.id))}
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-marble-800"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  s.id === state.step || i < steps.findIndex(x => x.id === state.step)
                    ? 'bg-accent-gold text-white shadow-glow-gold'
                    : 'bg-marble-700 text-ink-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className={`hidden text-sm sm:inline ${s.id === state.step ? 'text-ink' : 'text-ink-muted'}`}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {state.error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
          {state.error}
        </div>
      )}

      {state.isLoading && !state.error && (
        <div className="panel flex items-center justify-center gap-3 py-12">
          <Loader2 className="animate-spin text-accent-gold" size={24} />
          <span className="text-ink-muted">{t('wizard.examining')}</span>
        </div>
      )}

      {!state.isLoading && (
        <div className="animate-fade-in">
          {state.step === 'thesis' && (
            <ThesisStep
              thesis={state.session.thesis}
              onChange={thesis => dispatch(WizardActions.setThesis(thesis))}
              onSubmit={handleThesisSubmit}
            />
          )}
          {state.step === 'interrogation' && (
            <InterrogationStep
              questions={state.session.questions}
              answers={state.session.answers}
              onAnswer={(id, answer) => dispatch(WizardActions.setAnswer(id, answer))}
              onSubmit={handleInterrogationSubmit}
              canAdvance={canAdvance(state, 'interrogation')}
            />
          )}
          {state.step === 'distortions' && (
            <DistortionsStep
              distortions={state.session.distortions}
              onChange={distortion => dispatch(WizardActions.setDistortion(distortion))}
              onSubmit={handleDistortionsSubmit}
              canAdvance={canAdvance(state, 'distortions')}
            />
          )}
          {state.step === 'synthesis' && (
            <SynthesisStep
              synthesis={state.session.synthesis}
              thesis={state.session.thesis}
              onChange={synthesis => dispatch(WizardActions.setSynthesis(synthesis))}
              onSubmit={handleSynthesisSubmit}
              canAdvance={canAdvance(state, 'synthesis')}
            />
          )}
        </div>
      )}
    </div>
  );
}
