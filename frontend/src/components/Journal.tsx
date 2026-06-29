import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';
import { useConfirm } from './ConfirmDialog';
import { JournalCanvas, JournalCanvasRef } from './JournalCanvas';
import { CalendarPicker } from './CalendarPicker';
import enPrompts from '../../../content/journalPrompts.json';
import ruPrompts from '../../../content/journalPromptsRu.json';

interface Prompt {
  slug: string;
  text: string;
}

interface Category {
  slug: string;
  title: string;
  prompts: Prompt[];
}

interface JournalProps {
  onBack: () => void;
}

const localDate = (d = new Date()) => d.toLocaleDateString('en-CA');

const today = localDate();

const addDays = (dateStr: string, delta: number) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return localDate(d);
};

const clampToToday = (dateStr: string) => (dateStr > today ? today : dateStr);

export function Journal({ onBack }: JournalProps) {
  const { t, language } = useLanguage();
  const prompts = language === 'ru' ? (ruPrompts as { categories: Category[] }) : (enPrompts as { categories: Category[] });
  const categories = prompts.categories;
  const [date, setDate] = useState(today);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ daily: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<JournalCanvasRef>(null);
  const [initialDrawing, setInitialDrawing] = useState<string | undefined>();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [drawingVersion, setDrawingVersion] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);
    setIsDirty(false);
    loadedRef.current = false;
    api.getJournalEntry(date)
      .then(({ entry }) => {
        if (cancelled) return;
        setAnswers(entry?.answers ?? {});
        setInitialDrawing(entry?.drawing);
        setEntryId(entry?.id ?? null);
        loadedRef.current = true;
      })
      .catch(err => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [date, t]);

  const handleAnswerChange = (slug: string, value: string) => {
    setAnswers(prev => ({ ...prev, [slug]: value }));
    setIsDirty(true);
  };

  const handleDrawingChange = () => {
    setDrawingVersion(v => v + 1);
    setIsDirty(true);
  };

  const toggleCategory = (slug: string) => {
    setExpanded(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const drawing = canvasRef.current?.hasDrawing()
        ? canvasRef.current.getDataUrl()
        : undefined;
      const { entry } = await api.upsertJournalEntry({ entryDate: date, answers, drawing });
      if (!entry) throw new Error('Failed to save journal entry');
      setEntryId(entry.id);
      setInitialDrawing(entry.drawing);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isDirty || !loadedRef.current || loading || saving) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [answers, drawingVersion, isDirty, loading, saving]);

  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!entryId) return;
    const ok = await confirm({
      title: t('common.delete'),
      message: t('common.delete'),
      isDanger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    setLoading(true);
    try {
      await api.deleteJournalEntry(entryId);
      setAnswers({});
      setInitialDrawing(undefined);
      setEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </button>
        <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('journal.title')}</h2>
      </div>

      <div className="panel relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setDate(addDays(date, -1))} className="btn-secondary p-2">
            <ChevronLeft size={20} />
          </button>
          <CalendarPicker value={date} onChange={setDate} maxDate={today} locale={language} />
          <button
            onClick={() => setDate(clampToToday(addDays(date, 1)))}
            disabled={date >= today}
            className="btn-secondary p-2 disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {categories.map(category => {
              const isOpen = expanded[category.slug] ?? false;
              return (
                <div key={category.slug} className="panel overflow-hidden p-0">
                  <button
                    onClick={() => toggleCategory(category.slug)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-marble-800/50"
                  >
                    <span className="font-serif text-lg font-semibold">{category.title}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="space-y-4 px-4 pb-4">
                      {category.prompts.map(prompt => (
                        <div key={prompt.slug}>
                          <p className="text-sm font-medium text-ink">{prompt.text}</p>
                          <textarea
                            value={answers[prompt.slug] ?? ''}
                            onChange={e => handleAnswerChange(prompt.slug, e.target.value)}
                            className="input-field mt-2 min-h-[80px]"
                            placeholder={t('wizard.answerPlaceholder')}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h3 className="font-serif text-xl font-semibold">{t('journal.drawing')}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('journal.drawingHint')}</p>
            <div className="mt-4">
              <JournalCanvas ref={canvasRef} initialDrawing={initialDrawing} onChange={handleDrawingChange} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                <Save size={18} />
                {saving ? t('common.loading') : t('common.save')}
              </button>
              {saved && <span className="text-sm text-accent-gold">{t('journal.saved')}</span>}
            </div>
            {entryId && (
              <button onClick={handleDelete} className="btn-secondary text-red-400 hover:bg-red-500/10">
                <Trash2 size={18} />
                <span className="hidden sm:inline">{t('common.delete')}</span>
              </button>
            )}
          </div>
        </>
      )}

    </div>
  );
}
