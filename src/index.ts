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
import { logger } from './utils/logger.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || false,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  const dbOk = await dbHealth();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, service: 'the-socratic-paradox' });
});

app.use('/api', entriesRouter);
app.use('/api/journal', journalRouter);
app.use('/api', authRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`The Socratic Paradox API listening on port ${PORT}`);
});
