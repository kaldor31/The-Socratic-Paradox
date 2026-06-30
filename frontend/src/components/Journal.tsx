import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';
import { useCrypto } from '../auth/useCrypto';
import { useConfirm } from './ConfirmDialog';
import { JournalCanvas, JournalCanvasRef } from './JournalCanvas';
import type { DrawingHistoryState } from '../state/types';
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

const localDate = (d = new Date()) => d.toLocaleDateString('en-CA');

const today = localDate();

const BACKEND_HISTORY_LIMIT = 10;

function truncateHistoryState(state: DrawingHistoryState): DrawingHistoryState {
  if (state.items.length <= BACKEND_HISTORY_LIMIT) return state;
  const start = Math.max(0, Math.min(state.index, state.items.length - BACKEND_HISTORY_LIMIT));
  const end = Math.min(state.items.length, start + BACKEND_HISTORY_LIMIT);
  return {
    index: state.index - start,
    items: state.items.slice(start, end),
  };
}

const addDays = (dateStr: string, delta: number) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return localDate(d);
};

const clampToToday = (dateStr: string) => (dateStr > today ? today : dateStr);

export function Journal() {
  const { t, language } = useLanguage();
  const { encrypt, decrypt } = useCrypto();
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
  const [initialHistory, setInitialHistory] = useState<DrawingHistoryState | undefined>();
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
      .then(async ({ entry }) => {
        if (cancelled) return;
        try {
          const decryptedAnswers = entry?.answers ? JSON.parse(await decrypt(entry.answers)) : {};
          const decryptedDrawing = entry?.drawing ? await decrypt(entry.drawing) : undefined;
          const decryptedHistory = entry?.drawingHistory ? JSON.parse(await decrypt(entry.drawingHistory)) : undefined;
          setAnswers(decryptedAnswers);
          setInitialDrawing(decryptedDrawing);
          setInitialHistory(decryptedHistory);
          setEntryId(entry?.id ?? null);
        } catch {
          setError(t('common.error'));
          setAnswers({});
          setInitialDrawing(undefined);
          setInitialHistory(undefined);
          setEntryId(null);
        }
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
      const state = canvasRef.current?.getHistoryState();
      const backendHistory = state && state.items.length > 0 ? truncateHistoryState(state) : undefined;
      const encryptedAnswers = await encrypt(JSON.stringify(answers));
      const encryptedDrawing = drawing ? await encrypt(drawing) : undefined;
      const encryptedHistory = backendHistory ? await encrypt(JSON.stringify(backendHistory)) : undefined;
      const { entry } = await api.upsertJournalEntry({ entryDate: date, answers: encryptedAnswers, drawing: encryptedDrawing, drawingHistory: encryptedHistory });
      if (!entry) throw new Error('Failed to save journal entry');
      setEntryId(entry.id);
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
      setInitialHistory(undefined);
      setEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-bold sm:text-3xl">{t('journal.title')}</h2>

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
              <JournalCanvas ref={canvasRef} initialDrawing={initialDrawing} initialHistory={initialHistory} onChange={handleDrawingChange} storageKey={`sp-canvas-${date}`} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {saving && (
                <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
                  {t('common.loading')}
                </span>
              )}
              {!saving && saved && <span className="text-sm text-accent-gold">{t('journal.saved')}</span>}
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
