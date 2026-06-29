import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { journalService } from '../services/journalService.js';

const router = Router();

const upsertSchema = z.object({
  entryDate: z.string().date(),
  answers: z.record(z.string()),
  drawing: z.string().max(5_000_000).optional(),
});

const dateParamSchema = z.object({
  date: z.string().date(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await journalService.list(req.userId!);
    res.json({ ok: true, entries });
  } catch (err) {
    next(err);
  }
});

router.get('/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = dateParamSchema.parse(req.params);
    const entry = await journalService.getByDate(req.userId!, date);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = upsertSchema.parse(req.body);
    const entry = await journalService.upsert(req.userId!, dto);
    res.json({ ok: true, entry });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await journalService.delete(req.userId!, id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
