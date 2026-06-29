import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Calendar, MessageCircle, BrainCircuit, FileCheck } from 'lucide-react';
import { api } from '../api/client';
import { useCrypto } from '../auth/useCrypto';
import { useLanguage } from '../i18n/LanguageContext';
import { useConfirm } from './ConfirmDialog';
import { tDynamic } from '../i18n/translations';
import type { Question, InterrogationItem, DistortionAnalysisItem, DistortionOption } from '../state/types';
import { buildDistortionOptions } from '../utils/socraticLogic';

interface EntryDetailProps {
  entryId: string;
  onBack: () => void;
  onEdit: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
}

interface EnrichedInterrogationItem extends InterrogationItem {
  index: number;
  questionText: string;
  categoryText: string;
}

interface LoadedEntry {
  id: string;
  thesis: string;
  interrogation: EnrichedInterrogationItem[];
  distortions: DistortionOption[];
  synthesis: string;
  synthesisDrawing?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EntryDetail({ entryId, onBack, onEdit, onDelete }: EntryDetailProps) {
  const { t, language } = useLanguage();
  const { decrypt } = useCrypto();
  const confirm = useConfirm();
  const [entry, setEntry] = useState<LoadedEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getSession(entryId),
      api.getPrompts(),
      api.getDistortions(),
    ])
      .then(async ([sessionRes, promptsRes, distortionsRes]) => {
        if (cancelled) return;
        const encrypted = sessionRes.entry;
        const [thesisRaw, interrogationRaw, distortionAnalysisRaw, synthesisRaw] = await Promise.all([
          decrypt(encrypted.thesis),
          encrypted.interrogation ? decrypt(encrypted.interrogation) : Promise.resolve(''),
          encrypted.distortionAnalysis ? decrypt(encrypted.distortionAnalysis) : Promise.resolve(''),
          encrypted.synthesis ? decrypt(encrypted.synthesis) : Promise.resolve(''),
        ]);
        const interrogation: InterrogationItem[] = interrogationRaw ? JSON.parse(interrogationRaw) : [];
        const distortionAnalysis: DistortionAnalysisItem[] = distortionAnalysisRaw ? JSON.parse(distortionAnalysisRaw) : [];
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
        const prompts: Question[] = promptsRes.prompts.map(p => ({
          id: p.id,
          category: p.category,
          slug: p.slug,
          text: p.text,
        }));
        const allDistortions: DistortionOption[] = distortionsRes.distortions;
        const distortions = buildDistortionOptions(distortionAnalysis, allDistortions);
        const promptMap = new Map(prompts.map(p => [p.id, p]));
        const enrichedInterrogation = interrogation.map((item, index) => {
          const prompt = promptMap.get(item.promptId);
          return {
            ...item,
            index,
            questionText: prompt ? (tDynamic(`wizard.prompts.${prompt.slug}`, language) ?? prompt.text) : item.text,
            categoryText: prompt ? (tDynamic(`wizard.categories.${prompt.category}`, language) ?? prompt.category) : '',
          };
        });
        setEntry({
          id: encrypted.id,
          thesis: thesisRaw,
          interrogation: enrichedInterrogation,
          distortions,
          synthesis,
          synthesisDrawing,
          isFavorite: encrypted.isFavorite,
          createdAt: encrypted.createdAt,
          updatedAt: encrypted.updatedAt,
        });
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entryId, decrypt, t]);

  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = await confirm({
      title: t('common.delete'),
      message: t('entries.deleteConfirm'),
      isDanger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteEntry(entryId);
      onDelete(entryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="panel">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
          {error || t('common.error')}
        </div>
        <button onClick={onBack} className="btn-secondary mt-4">
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
      </div>

      <div className="panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold sm:text-2xl">{entry.thesis}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-dim">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(entry.createdAt).toLocaleDateString(language)}
              </span>
              {entry.isFavorite && (
                <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-xs text-accent-gold">
                  {t('entries.favorite')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(entry.id)} className="btn-primary">
              <Pencil size={18} />
              {t('entries.edit')}
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel mt-6">
        <div className="flex items-center gap-2 text-accent-rust">
          <MessageCircle size={18} />
          <h3 className="font-serif text-lg font-semibold">{t('wizard.interrogation')}</h3>
        </div>
        {entry.interrogation.length === 0 ? (
          <p className="mt-4 text-ink-muted">{t('entryDetail.noInterrogation')}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {entry.interrogation.map(item => (
              <div key={item.promptId} className="rounded-xl border border-marble-700 bg-marble-900/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-rust/20 text-accent-rust text-xs">
                    {item.index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-serif text-ink">{item.questionText}</p>
                    <span className="text-xs uppercase tracking-wider text-ink-dim">{item.categoryText}</span>
                    <p className="mt-2 text-sm text-ink-muted">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel mt-6">
        <div className="flex items-center gap-2 text-accent-patina">
          <BrainCircuit size={18} />
          <h3 className="font-serif text-lg font-semibold">{t('wizard.distortions')}</h3>
        </div>
        {entry.distortions.length === 0 ? (
          <p className="mt-4 text-ink-muted">{t('entryDetail.noDistortions')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {entry.distortions.map(d => (
              <div key={d.id} className="rounded-xl border border-marble-700 bg-marble-900/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.colorAccent }} />
                  <span className="font-medium text-ink">{d.label}</span>
                  <span className="ml-auto text-sm text-ink-dim">{d.confidence}%</span>
                </div>
                {d.evidence && <p className="mt-2 text-sm text-ink-muted">{d.evidence}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel mt-6">
        <div className="flex items-center gap-2 text-accent-gold">
          <FileCheck size={18} />
          <h3 className="font-serif text-lg font-semibold">{t('wizard.synthesis')}</h3>
        </div>
        {entry.synthesis ? (
          <p className="mt-4 whitespace-pre-wrap font-serif text-ink">{entry.synthesis}</p>
        ) : (
          <p className="mt-4 text-ink-muted">{t('entryDetail.noSynthesis')}</p>
        )}
        {entry.synthesisDrawing && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-ink-muted">{t('entryDetail.synthesisDrawing')}</p>
            <img
              src={entry.synthesisDrawing}
              alt="Synthesis drawing"
              className="rounded-xl border border-marble-700"
            />
          </div>
        )}
      </div>
    </div>
  );
}
