import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { socraticService } from '../services/socraticService.js';
import { entryRepository } from '../repositories/entryRepository.js';
import { authenticate } from '../middleware/auth.js';
import { sql } from '../db.js';

const router = Router();

const createSchema = z.object({
  thesis: z.string().min(1),
});

const interrogationSchema = z.object({
  entryId: z.string().uuid(),
  // encrypted JSON string of InterrogationItem[]
  interrogation: z.string().min(1),
});

const distortionsSchema = z.object({
  entryId: z.string().uuid(),
  // encrypted JSON string of DistortionAnalysisItem[]
  distortionAnalysis: z.string().min(1),
  distortions: z.array(
    z.object({
      distortionId: z.string().uuid(),
      confidence: z.number().int().min(0).max(100),
      evidence: z.string().default(''),
    })
  ),
});

const synthesisSchema = z.object({
  entryId: z.string().uuid(),
  // encrypted text
  synthesis: z.string().min(1),
});

const paramsSchema = z.object({
  entryId: z.string().uuid(),
});

async function requireEntryOwner(entryId: string, userId: string) {
  const entry = await entryRepository.findById(entryId);
  if (!entry) {
    const err = new Error('Entry not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (entry.userId !== userId) {
    const err = new Error('Forbidden') as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
  return entry;
}

router.get('/distortions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await sql`
      SELECT id, slug, label, description, color_accent, occurrence_count, created_at
      FROM distortions
      ORDER BY occurrence_count DESC, label
    `;
    const distortions = (rows as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      slug: r.slug as string,
      label: r.label as string,
      description: r.description as string,
      colorAccent: r.color_accent as string,
      occurrenceCount: r.occurrence_count as number,
      createdAt: r.created_at as string,
    }));
    res.json({ ok: true, distortions });
  } catch (err) {
    next(err);
  }
});

router.get('/prompts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await sql`
      SELECT id, category, slug, text, sort_order, is_active, created_at
      FROM socratic_prompts
      WHERE is_active = true
      ORDER BY category, sort_order
    `;
    const prompts = (rows as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      category: r.category as string,
      slug: r.slug as string,
      text: r.text as string,
      sortOrder: r.sort_order as number,
      isActive: r.is_active as boolean,
      createdAt: r.created_at as string,
    }));
    res.json({ ok: true, prompts });
  } catch (err) {
    next(err);
  }
});

router.use(authenticate);

router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { thesis } = createSchema.parse(req.body);
    const entry = await socraticService.beginSession(req.userId!, thesis);
    res.status(201).json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/interrogation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = interrogationSchema.parse(req.body);
    const entry = await socraticService.continueInterrogation(req.userId!, dto);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/distortions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = distortionsSchema.parse(req.body);
    const entry = await socraticService.analyzeDistortions(req.userId!, dto);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/synthesis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = synthesisSchema.parse(req.body);
    const entry = await socraticService.synthesize(req.userId!, dto);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:entryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entryId } = paramsSchema.parse(req.params);
    const entry = await socraticService.getSession(req.userId!, entryId);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.get('/me/entries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const entries = await entryRepository.findByUserId(req.userId!, limit, offset);
    res.json({ ok: true, entries });
  } catch (err) {
    next(err);
  }
});

router.get('/me/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await entryRepository.getDashboardMetrics(req.userId!);
    res.json({ ok: true, metrics });
  } catch (err) {
    next(err);
  }
});

router.post('/entries/:entryId/favorite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entryId } = paramsSchema.parse(req.params);
    const { isFavorite } = z.object({ isFavorite: z.boolean() }).parse(req.body);
    await requireEntryOwner(entryId, req.userId!);
    const entry = await entryRepository.toggleFavorite(entryId, isFavorite);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.delete('/entries/:entryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entryId } = paramsSchema.parse(req.params);
    await requireEntryOwner(entryId, req.userId!);
    await entryRepository.delete(entryId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
export default router;
