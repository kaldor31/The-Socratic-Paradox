import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { logger } from '../src/utils/logger.js';

config();

const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_POOL_URL;

if (!connectionString) {
  logger.error('DATABASE_URL or DATABASE_POOL_URL is required');
  process.exit(1);
}

const client = new Client(connectionString);

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  { name: 'schema', path: join(__dirname, '..', 'database', 'schema.sql') },
  { name: 'indexes', path: join(__dirname, '..', 'database', 'indexes.sql') },
  { name: 'seed', path: join(__dirname, '..', 'database', 'seed.sql') },
];

function stripComments(sqlText: string): string {
  // Remove line comments that start with -- (not inside strings)
  return sqlText
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

function splitStatements(sqlText: string): string[] {
  const cleaned = stripComments(sqlText);
  return cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
}

async function runFile(name: string, filePath: string): Promise<void> {
  logger.info(`Running migration: ${name}`);
  const content = await readFile(filePath, 'utf-8');
  const statements = splitStatements(content);

  for (const statement of statements) {
    await client.query(statement + ';');
  }

  logger.info(`Migration completed: ${name} (${statements.length} statements)`);
}

async function main(): Promise<void> {
  await client.connect();

  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  if (reset) {
    logger.info('Resetting database...');
    await client.query('DROP TABLE IF EXISTS entry_distortions CASCADE;');
    await client.query('DROP TABLE IF EXISTS entries CASCADE;');
    await client.query('DROP TABLE IF EXISTS socratic_prompts CASCADE;');
    await client.query('DROP TABLE IF EXISTS distortions CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
  }

  for (const { name, path } of files) {
    await runFile(name, path);
  }

  logger.info('All migrations applied successfully');
  await client.end();
  process.exit(0);
}

main().catch(async err => {
  logger.error({ err }, 'Migration failed');
  await client.end().catch(() => {});
  process.exit(1);
});
