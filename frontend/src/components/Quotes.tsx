import { useMemo } from 'react';
import { Quote } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import enQuotes from '../../../content/quotes.json';
import ruQuotes from '../../../content/quotesRu.json';

interface QuoteItem {
  text: string;
  author: string;
}

export function Quotes() {
  const { language } = useLanguage();
  const data = language === 'ru' ? (ruQuotes as { quotes: QuoteItem[] }) : (enQuotes as { quotes: QuoteItem[] });
  const quotes = useMemo(() => {
    const copy = [...data.quotes];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [data.quotes]);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{language === 'ru' ? 'Вдохновение' : 'Inspiration'}</h2>
      <p className="text-ink-muted">
        {language === 'ru'
          ? 'Коллекция мыслей, которые помогают взглянуть на себя и мир иначе.'
          : 'A collection of thoughts to help you see yourself and the world differently.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q, idx) => (
          <div
            key={idx}
            className="panel relative flex flex-col justify-between border border-marble-700 bg-marble-800/80"
          >
            <Quote size={24} className="absolute right-4 top-4 text-accent-gold/30" />
            <p className="pr-8 font-serif text-lg italic leading-relaxed text-ink">"{q.text}"</p>
            <p className="mt-4 text-sm font-medium text-ink-muted">— {q.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
