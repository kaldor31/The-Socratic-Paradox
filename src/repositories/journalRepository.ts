import { sql } from '../db.js';
import type { DbClient } from '../db.js';
import { snakeToCamel } from '../utils/snakeToCamel.js';
import type { JournalEntry, UpsertJournalEntryDto } from '../types/index.js';

function toIsoString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0] ?? '';
  if (typeof value === 'string') return value.split('T')[0] ?? '';
  return String(value);
}

function parseJournalEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    userId: row.userId as string,
    entryDate: toDateString(row.entryDate),
    answers: (row.answers as Record<string, string>) ?? {},
    drawing: (row.drawing as string) ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export class JournalRepository {
  constructor(private readonly db: DbClient = sql) {}

  async upsert(userId: string, dto: UpsertJournalEntryDto): Promise<JournalEntry> {
    const rows = await this.db`
      INSERT INTO journal_entries (user_id, entry_date, answers, drawing)
      VALUES (${userId}, ${dto.entryDate}, ${JSON.stringify(dto.answers)}::jsonb, ${dto.drawing ?? null})
      ON CONFLICT (user_id, entry_date)
      DO UPDATE SET answers = EXCLUDED.answers,
                    drawing = EXCLUDED.drawing,
                    updated_at = now()
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Failed to upsert journal entry');
    return parseJournalEntry(row);
  }

  async findById(entryId: string): Promise<JournalEntry | null> {
    const rows = await this.db`SELECT * FROM journal_entries WHERE id = ${entryId}`;
    const row = snakeToCamel(rows)[0];
    return row ? parseJournalEntry(row) : null;
  }

  async findByDate(userId: string, entryDate: string): Promise<JournalEntry | null> {
    const rows = await this.db`
      SELECT * FROM journal_entries
      WHERE user_id = ${userId} AND entry_date = ${entryDate}
    `;
    const row = snakeToCamel(rows)[0];
    return row ? parseJournalEntry(row) : null;
  }

  async findByUserId(userId: string): Promise<JournalEntry[]> {
    const rows = await this.db`
      SELECT * FROM journal_entries
      WHERE user_id = ${userId}
      ORDER BY entry_date DESC
      LIMIT 50
    `;
    return snakeToCamel(rows).map(parseJournalEntry);
  }

  async delete(entryId: string): Promise<void> {
    await this.db`DELETE FROM journal_entries WHERE id = ${entryId}`;
  }
}

export const journalRepository = new JournalRepository();
