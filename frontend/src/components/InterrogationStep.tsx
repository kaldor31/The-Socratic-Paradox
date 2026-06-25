import { MessageCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Question {
  id: string;
  text: string;
  category: string;
}

interface InterrogationStepProps {
  questions: Question[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  canAdvance: boolean;
}

export function InterrogationStep({ questions, answers, onAnswer, onSubmit, canAdvance }: InterrogationStepProps) {
  const { t, language } = useLanguage();

  return (
    <div className="panel">
      <h2 className="font-serif text-3xl font-bold">{t('wizard.interrogationTitle')}</h2>
      <p className="mt-2 text-ink-muted">{t('wizard.interrogationHint')}</p>

      <div className="mt-6 space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="rounded-xl border border-marble-700 bg-marble-900/50 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-rust/20 text-accent-rust">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-serif text-lg text-ink">{q.text}</p>
                <span className="mt-1 inline-block text-xs uppercase tracking-wider text-ink-dim">
                  {q.category}
                </span>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  placeholder={language === 'ru' ? 'Ваше размышление...' : 'Your reflection...'}
                  className="input-field mt-3 min-h-[100px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={onSubmit} disabled={!canAdvance} className="btn-primary disabled:opacity-50">
          <MessageCircle size={18} />
          {t('wizard.continue')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
