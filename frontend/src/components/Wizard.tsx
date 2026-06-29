import { useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { wizardReducer, initialWizardState, WizardActions, canAdvance, isStepAccessible } from '../state/wizardMachine';
import { api } from '../api/client';
import type { EncryptedEntry } from '../api/client';
import type { Prompt } from '../api/types';
import { useCrypto } from '../auth/useCrypto';
import { useLanguage } from '../i18n/LanguageContext';
import { ThesisStep } from './ThesisStep';
import { InterrogationStep } from './InterrogationStep';
import { DistortionsStep } from './DistortionsStep';
import { SynthesisStep } from './SynthesisStep';
import type { WizardSession, Question, DistortionOption, InterrogationItem, DistortionAnalysisItem } from '../state/types';
import {
  selectPrompts,
  buildAnswers,
  buildInterrogation,
  buildDistortionOptions,
  suggestDistortions,
} from '../utils/socraticLogic';

interface WizardProps {
  entryId?: string;
  onFinish: (entryId: string) => void;
}

interface SocraticCatalog {
  prompts: Question[];
  distortions: DistortionOption[];
}

function toQuestions(prompts: Prompt[]): Question[] {
  return prompts.map(p => ({ id: p.id, category: p.category, slug: p.slug, text: p.text }));
}

export function Wizard({ entryId, onFinish }: WizardProps) {
  const { t } = useLanguage();
  const { encrypt, decrypt } = useCrypto();
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [catalog, setCatalog] = useState<SocraticCatalog | null>(null);
  const catalogRef = useRef<SocraticCatalog | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : t('common.error');
      dispatch(WizardActions.setError(message));
    },
    [t]
  );

  const decryptEntry = useCallback(
    async (entry: EncryptedEntry): Promise<WizardSession> => {
      const cat = catalogRef.current;
      if (!cat) throw new Error('Socratic catalog not loaded');
      const [thesis, interrogationStr, distortionAnalysisStr, synthesisRaw] = await Promise.all([
        decrypt(entry.thesis),
        entry.interrogation ? decrypt(entry.interrogation) : Promise.resolve(''),
        entry.distortionAnalysis ? decrypt(entry.distortionAnalysis) : Promise.resolve(''),
        entry.synthesis ? decrypt(entry.synthesis) : Promise.resolve(''),
      ]);
      const interrogation: InterrogationItem[] = interrogationStr ? JSON.parse(interrogationStr) : [];
      const distortionAnalysis: DistortionAnalysisItem[] = distortionAnalysisStr ? JSON.parse(distortionAnalysisStr) : [];
      let synthesis = '';
      let synthesisDrawing: string | undefined;
      if (synthesisRaw) {
        try {
          const parsed = JSON.parse(synthesisRaw);
          if (parsed && typeof parsed === 'object') {
            synthesis = parsed.text || '';
            synthesisDrawing = parsed.drawing;
          } else {
            synthesis = synthesisRaw;
          }
        } catch {
          synthesis = synthesisRaw;
        }
      }
      const answers = buildAnswers(interrogation);
      const questions = selectPrompts(cat.prompts, thesis);
      const distortions = buildDistortionOptions(distortionAnalysis, cat.distortions);
      return {
        entryId: entry.id,
        status: entry.status,
        thesis,
        questions,
        answers,
        distortions,
        synthesis,
        synthesisDrawing,
      };
    },
    [decrypt]
  );

  useEffect(() => {
    let cancelled = false;
    dispatch(WizardActions.setLoading(true));
    Promise.all([
      api.getPrompts(),
      api.getDistortions(),
      entryId ? api.getSession(entryId) : Promise.resolve(null),
    ])
      .then(async ([promptsRes, distortionsRes, sessionRes]) => {
        if (cancelled) return;
        const newCatalog: SocraticCatalog = {
          prompts: toQuestions(promptsRes.prompts),
          distortions: distortionsRes.distortions,
        };
        catalogRef.current = newCatalog;
        setCatalog(newCatalog);
        if (sessionRes) {
          const session = await decryptEntry(sessionRes.entry);
          if (sessionRes.entry.status === 'synthesis') {
            localStorage.removeItem(`sp-synthesis-drawing-${sessionRes.entry.id}`);
          }
          dispatch(WizardActions.initSession({ ...session, synthesis: session.synthesis || '' }));
        } else {
          dispatch(WizardActions.setLoading(false));
        }
      })
      .catch(err => {
        if (!cancelled) handleError(err);
      })
      .finally(() => {
        if (!cancelled) dispatch(WizardActions.setLoading(false));
      });
    return () => {
      cancelled = true;
    };
  }, [entryId, handleError, decryptEntry]);

  const handleThesisSubmit = async (thesis: string) => {
    if (state.session.entryId) {
      dispatch(WizardActions.setStep('interrogation'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      const encryptedThesis = await encrypt(thesis);
      const { entry } = await api.createSession({ thesis: encryptedThesis });
      const session = await decryptEntry(entry);
      dispatch(WizardActions.advanceToInterrogation(session));
    } catch (err) {
      handleError(err);
    } finally {
      dispatch(WizardActions.setLoading(false));
    }
  };

  const handleInterrogationSubmit = async () => {
    if (state.session.status === 'synthesis') {
      dispatch(WizardActions.setStep('distortions'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      if (!catalog) throw new Error('Socratic catalog not loaded');
      const interrogation = buildInterrogation(state.session.answers, catalog.prompts);
      const encryptedInterrogation = await encrypt(JSON.stringify(interrogation));
      const { entry } = await api.submitInterrogation({
        entryId: state.session.entryId,
        interrogation: encryptedInterrogation,
      });
      const session = await decryptEntry(entry);
      if (state.session.status === 'distortions') {
        dispatch(WizardActions.updateSession(session));
        dispatch(WizardActions.setStep('distortions'));
      } else {
        const suggested = suggestDistortions(session.thesis, interrogation, catalog.distortions);
        dispatch(WizardActions.advanceToDistortions({ ...session, distortions: suggested }));
      }
    } catch (err) {
      handleError(err);
    } finally {
      dispatch(WizardActions.setLoading(false));
    }
  };

  const handleDistortionsSubmit = async () => {
    if (state.session.status === 'synthesis') {
      dispatch(WizardActions.setStep('synthesis'));
      return;
    }
    dispatch(WizardActions.setLoading(true));
    try {
      if (!catalog) throw new Error('Socratic catalog not loaded');
      const analysis: DistortionAnalysisItem[] = state.session.distortions.map(d => ({
        distortionId: d.id,
        label: d.label,
        confidence: d.confidence,
        evidence: d.evidence,
      }));
      const encryptedAnalysis = await encrypt(JSON.stringify(analysis));
      const distortionsPayload = await Promise.all(
        state.session.distortions.map(async d => ({
          distortionId: d.id,
          confidence: d.confidence,
          evidence: d.evidence ? await encrypt(d.evidence) : '',
        }))
      );
      const { entry } = await api.submitDistortions({
        entryId: state.session.entryId,
        distortionAnalysis: encryptedAnalysis,
        distortions: distortionsPayload,
      });
      const session = await decryptEntry(entry);
      dispatch(WizardActions.complete(session));
    } catch (err) {
      handleError(err);
    } finally {
      dispatch(WizardActions.setLoading(false));
    }
  };

  const handleSynthesisSubmit = async (synthesis: string, drawing?: string) => {
    dispatch(WizardActions.setLoading(true));
    try {
      const payload = JSON.stringify({ text: synthesis, drawing });
      const encryptedSynthesis = await encrypt(payload);
      await api.submitSynthesis({
        entryId: state.session.entryId,
        synthesis: encryptedSynthesis,
      });
      dispatch(WizardActions.complete({ ...state.session, synthesis, synthesisDrawing: drawing }));
      onFinish(state.session.entryId);
    } catch (err) {
      handleError(err);
    } finally {
      dispatch(WizardActions.setLoading(false));
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
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map((s, i) => {
            const accessible = isStepAccessible(state, s.id);
            return (
              <button
                key={s.id}
                disabled={!accessible}
                onClick={() => accessible && dispatch(WizardActions.setStep(s.id))}
                className={`flex items-center gap-1 rounded-lg p-1 transition-colors sm:gap-2 ${
                  accessible ? 'hover:bg-marble-800' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
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
            );
          })}
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
              entryId={state.session.entryId}
              synthesis={state.session.synthesis}
              drawing={state.session.synthesisDrawing}
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
