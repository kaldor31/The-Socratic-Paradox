import { useEffect, useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import en from '../../../content/onboardingData.json';
import ru from '../../../content/onboardingDataRu.json';
import { useLanguage } from '../i18n/LanguageContext';
import type { Language } from '../i18n/translations';

interface OnboardingProps {
  onStart: () => void;
}

const content: Record<Language, typeof en> = { en, ru };

export function Onboarding({ onStart }: OnboardingProps) {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const onboardingData = content[language];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`space-y-12 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <section className="text-center">
        <h2 className="font-serif text-4xl font-bold sm:text-5xl">
          <span className="text-gradient">{onboardingData.title}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">{onboardingData.subtitle}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {onboardingData.steps.map((step, index) => (
          <div key={step.id} className="panel relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent-gold/10 blur-2xl" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-marble-700 font-serif text-lg font-bold text-accent-gold">
                {index + 1}
              </div>
              <h3 className="font-serif text-2xl font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm font-medium uppercase tracking-widest text-accent-gold">
                {step.heading}
              </p>
              <p className="mt-4 text-ink-muted leading-relaxed">{step.body}</p>
              <div className="mt-6 border-l-2 border-accent-gold/30 pl-4">
                <Quote size={16} className="mb-2 text-accent-gold" />
                <p className="font-serif italic text-ink">{step.quote}</p>
                <p className="mt-1 text-xs text-ink-dim">— {step.quoteAuthor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="panel mx-auto max-w-3xl text-center">
        <h3 className="font-serif text-2xl font-semibold">{onboardingData.wizardIntro.title}</h3>
        <p className="mt-3 text-ink-muted">{onboardingData.wizardIntro.body}</p>
        <button onClick={onStart} className="btn-primary mt-8">
          {onboardingData.cta.primary}
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
