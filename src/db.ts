import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';

config();

const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_POOL_URL;

if (!connectionString) {
  logger.error('DATABASE_URL or DATABASE_POOL_URL is required');
  process.exit(1);
}

export const sql = neon(connectionString, {
  fetchOptions: {
    cache: 'no-store',
  },
});

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
