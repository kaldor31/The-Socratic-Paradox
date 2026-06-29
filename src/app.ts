import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';

import { dbHealth } from './db.js';
import entriesRouter from './routes/entries.js';
import journalRouter from './routes/journal.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use((req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const origin = isDev ? true : process.env.CLIENT_ORIGIN || `${protocol}://${req.headers.host}`;
  cors({ origin, credentials: true })(req, res, next);
});
app.use(cookieParser());
app.use(json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  const dbOk = await dbHealth();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, service: 'the-socratic-paradox' });
});

app.use('/api/journal', journalRouter);
app.use('/api', authRouter);
app.use('/api', entriesRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

app.use(errorHandler);
