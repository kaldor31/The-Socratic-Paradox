import { sql } from '../db.js';
import { entryRepository } from '../repositories/entryRepository.js';
import type {
  SocraticSession,
  SocraticPrompt,
  Distortion,
  InterrogationItem,
  DistortionAnalysisItem,
  Entry,
  UpdateInterrogationDto,
  UpdateDistortionsDto,
  UpdateSynthesisDto,
} from '../types/index.js';

const DEFAULT_QUESTION_COUNT = 5;

async function fetchPrompts(): Promise<SocraticPrompt[]> {
  const rows = await sql`
    SELECT id, category, slug, text, sort_order, is_active, created_at
    FROM socratic_prompts
    WHERE is_active = true
    ORDER BY category, sort_order
  `;
  return (rows as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    category: r.category as string,
    slug: r.slug as string,
    text: r.text as string,
    sortOrder: r.sort_order as number,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  }));
}

async function fetchDistortions(): Promise<Distortion[]> {
  const rows = await sql`
    SELECT id, slug, label, description, color_accent, occurrence_count, created_at
    FROM distortions
    ORDER BY occurrence_count DESC, label
  `;
  return (rows as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    slug: r.slug as string,
    label: r.label as string,
    description: r.description as string,
    colorAccent: r.color_accent as string,
    occurrenceCount: r.occurrence_count as number,
    createdAt: r.created_at as string,
  }));
}

function selectPrompts(prompts: SocraticPrompt[], thesis: string, count: number): SocraticPrompt[] {
  const categories = [...new Set(prompts.map(p => p.category))];
  const selected: SocraticPrompt[] = [];
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

function suggestDistortions(
  thesis: string,
  answers: InterrogationItem[],
  distortions: Distortion[]
): DistortionAnalysisItem[] {
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
      distortionId: d.id,
      label: d.label,
      confidence,
      evidence: '',
    };
  });
}

export class SocraticService {
  private promptsPromise: Promise<SocraticPrompt[]> | null = null;
  private distortionsPromise: Promise<Distortion[]> | null = null;

  private getPrompts(): Promise<SocraticPrompt[]> {
    if (!this.promptsPromise) {
      this.promptsPromise = fetchPrompts();
    }
    return this.promptsPromise;
  }

  private getDistortions(): Promise<Distortion[]> {
    if (!this.distortionsPromise) {
      this.distortionsPromise = fetchDistortions();
    }
    return this.distortionsPromise;
  }

  async beginSession(userId: string, thesis: string): Promise<SocraticSession> {
    const entry = await entryRepository.create({ userId, thesis });
    const prompts = await this.getPrompts();
    const questions = selectPrompts(prompts, thesis, DEFAULT_QUESTION_COUNT);

    return {
      entryId: entry.id,
      status: entry.status,
      thesis: entry.thesis,
      questions,
      interrogation: entry.interrogation,
      distortions: entry.distortionAnalysis,
      synthesis: entry.synthesis,
    };
  }

  private async requireOwner(entryId: string, userId: string): Promise<Entry> {
    const entry = await entryRepository.findById(entryId);
    if (!entry) throw new Error('Entry not found');
    if (entry.userId !== userId) throw new Error('Forbidden');
    return entry;
  }

  async continueInterrogation(userId: string, dto: UpdateInterrogationDto): Promise<SocraticSession> {
    await this.requireOwner(dto.entryId, userId);

    const prompts = await this.getPrompts();
    const promptMap = new Map(prompts.map(p => [p.id, p]));

    const interrogation: InterrogationItem[] = Object.entries(dto.answers)
      .filter(([id]) => promptMap.has(id))
      .map(([promptId, answer]) => ({
        promptId,
        text: promptMap.get(promptId)!.text,
        answer,
        answeredAt: new Date().toISOString(),
      }));

    const updated = await entryRepository.updateInterrogation(dto.entryId, interrogation);
    const distortions = await this.getDistortions();
    const suggestedDistortions = suggestDistortions(updated.thesis, interrogation, distortions);

    return {
      entryId: updated.id,
      status: updated.status,
      thesis: updated.thesis,
      questions: [],
      interrogation: updated.interrogation,
      distortions: suggestedDistortions,
      synthesis: updated.synthesis,
    };
  }

  async analyzeDistortions(userId: string, dto: UpdateDistortionsDto): Promise<SocraticSession> {
    await this.requireOwner(dto.entryId, userId);

    const distortions = await this.getDistortions();
    const distortionMap = new Map(distortions.map(d => [d.id, d]));

    const distortionAnalysis: DistortionAnalysisItem[] = dto.distortions
      .filter(d => distortionMap.has(d.distortionId))
      .map(d => ({
        distortionId: d.distortionId,
        label: distortionMap.get(d.distortionId)!.label,
        confidence: Math.min(100, Math.max(0, d.confidence)),
        evidence: d.evidence,
      }));

    const updated = await entryRepository.updateDistortions(dto.entryId, distortionAnalysis);

    await sql`DELETE FROM entry_distortions WHERE entry_id = ${dto.entryId}`;
    for (const d of distortionAnalysis) {
      await sql`
        INSERT INTO entry_distortions (entry_id, distortion_id, confidence, evidence)
        VALUES (${dto.entryId}, ${d.distortionId}, ${d.confidence}, ${d.evidence})
      `;
    }

    return {
      entryId: updated.id,
      status: updated.status,
      thesis: updated.thesis,
      questions: [],
      interrogation: updated.interrogation,
      distortions: updated.distortionAnalysis,
      synthesis: updated.synthesis,
    };
  }

  async synthesize(userId: string, dto: UpdateSynthesisDto): Promise<SocraticSession> {
    await this.requireOwner(dto.entryId, userId);

    const updated = await entryRepository.updateSynthesis(dto.entryId, dto.synthesis);
    return {
      entryId: updated.id,
      status: updated.status,
      thesis: updated.thesis,
      questions: [],
      interrogation: updated.interrogation,
      distortions: updated.distortionAnalysis,
      synthesis: updated.synthesis,
    };
  }

  async getSession(userId: string, entryId: string): Promise<SocraticSession> {
    const entry = await this.requireOwner(entryId, userId);
    return {
      entryId: entry.id,
      status: entry.status,
      thesis: entry.thesis,
      questions: [],
      interrogation: entry.interrogation,
      distortions: entry.distortionAnalysis,
      synthesis: entry.synthesis,
    };
  }
}

export const socraticService = new SocraticService();
