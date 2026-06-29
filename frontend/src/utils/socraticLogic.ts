import type { Question, InterrogationItem, DistortionOption, DistortionAnalysisItem } from '../state/types';

const DEFAULT_QUESTION_COUNT = 5;

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function seededRandom(seed: number, max: number): number {
  return seed % Math.max(1, max);
}

export function selectPrompts(prompts: Question[], thesis: string, count = DEFAULT_QUESTION_COUNT): Question[] {
  const categories = [...new Set(prompts.map(p => p.category))];
  const selected: Question[] = [];
  let seed = hashString(thesis);
  for (const category of categories) {
    if (selected.length >= count) break;
    const pool = prompts.filter(p => p.category === category);
    if (pool.length === 0) continue;
    const index = seededRandom(seed, pool.length);
    selected.push(pool[index]!);
    seed += 1;
  }
  return selected.slice(0, count);
}

export function buildAnswers(interrogation: InterrogationItem[]): Record<string, string> {
  return Object.fromEntries(interrogation.map(item => [item.promptId, item.answer]));
}

export function buildInterrogation(
  answers: Record<string, string>,
  prompts: Question[]
): InterrogationItem[] {
  const promptMap = new Map(prompts.map(p => [p.id, p]));
  return Object.entries(answers)
    .filter(([id]) => promptMap.has(id))
    .map(([promptId, answer]) => ({
      promptId,
      text: promptMap.get(promptId)!.text,
      answer,
      answeredAt: new Date().toISOString(),
    }));
}

export function buildDistortionOptions(
  analysis: DistortionAnalysisItem[],
  allDistortions: DistortionOption[]
): DistortionOption[] {
  return analysis.map(a => {
    const d = allDistortions.find(d => d.id === a.distortionId);
    return {
      id: a.distortionId,
      slug: d?.slug || '',
      label: d?.label || a.label,
      description: d?.description || '',
      colorAccent: d?.colorAccent || '#7c3aed',
      occurrenceCount: d?.occurrenceCount ?? 0,
      createdAt: d?.createdAt || new Date().toISOString(),
      confidence: a.confidence,
      evidence: a.evidence,
    };
  });
}

export function suggestDistortions(
  thesis: string,
  answers: InterrogationItem[],
  distortions: DistortionOption[]
): DistortionOption[] {
  const text = (thesis + ' ' + answers.map(a => a.answer).join(' ')).toLowerCase();
  const patterns: Record<string, string[]> = {
    catastrophizing: ['worst', 'disaster', 'horrible', 'never recover', 'everything falls'],
    mind_reading: ['they think', 'she thinks', 'he thinks', 'everyone believes'],
    all_or_nothing: ['always', 'never', 'completely', 'totally', 'failure', 'perfect'],
    emotional_reasoning: ['feel like', 'feels true', 'i feel that'],
    should_statements: ['should', 'must', 'ought', 'have to', 'supposed to'],
    mental_filter: ['only bad', 'only problem', 'nothing good', 'constantly'],
    labeling: ['idiot', 'loser', 'failure', 'useless', 'bad person'],
    personalization: ['my fault', 'because of me', 'i caused', 'blame myself'],
  };

  return distortions.map(d => {
    const keywords = patterns[d.slug] ?? [];
    const hits = keywords.filter(k => text.includes(k)).length;
    const confidence = Math.min(100, hits * 25 + 10);
    return {
      id: d.id,
      slug: d.slug,
      label: d.label,
      description: d.description,
      colorAccent: d.colorAccent,
      occurrenceCount: d.occurrenceCount,
      createdAt: d.createdAt,
      confidence,
      evidence: '',
    };
  });
}
