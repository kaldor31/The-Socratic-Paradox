import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';

config();

const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_POOL_URL;

if (!connectionString) {
  logger.error('DATABASE_URL or DATABASE_POOL_URL is required');
  process.exit(1);
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 75;

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('stream error') ||
    msg.includes('fetch failed') ||
    msg.includes('connection terminated unexpectedly') ||
    msg.includes('socket closed') ||
    msg.includes('other side closed') ||
    msg.includes('und_err_socket') ||
    msg.includes('neonerror') ||
    msg.includes('neondberror')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const rawSql = neon(connectionString, {
  fetchOptions: {
    cache: 'no-store',
  },
});

async function queryWithRetry(strings: TemplateStringsArray, ...values: unknown[]) {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await rawSql(strings, ...values);
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err;
      }
      logger.warn({ attempt, err }, 'Database query failed, retrying');
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

export const sql: NeonQueryFunction<false, false> = Object.assign(queryWithRetry, rawSql);

export type DbClient = typeof sql;

export async function dbHealth(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as ok`;
    return (result[0]?.ok as number) === 1;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}
