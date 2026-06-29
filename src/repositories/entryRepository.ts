import { sql } from '../db.js';
import type { DbClient } from '../db.js';
import { snakeToCamel } from '../utils/snakeToCamel.js';
import type {
  Entry,
  CreateEntryDto,
  EntryStatus,
  DashboardMetric,
} from '../types/index.js';

function parseEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    userId: row.userId as string,
    thesis: (row.thesis as string) ?? '',
    interrogation: (row.interrogation as string) ?? '',
    distortionAnalysis: (row.distortionAnalysis as string) ?? '',
    synthesis: (row.synthesis as string) ?? undefined,
    status: row.status as EntryStatus,
    isFavorite: row.isFavorite as boolean,
    completedAt: (row.completedAt as string) ?? undefined,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export class EntryRepository {
  constructor(private readonly db: DbClient = sql) {}

  async create(dto: CreateEntryDto): Promise<Entry> {
    const rows = await this.db`
      INSERT INTO entries (user_id, thesis, status)
      VALUES (${dto.userId}, ${dto.thesis}, 'interrogation')
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Failed to create entry');
    return parseEntry(row);
  }

  async findById(entryId: string): Promise<Entry | null> {
    const rows = await this.db`SELECT * FROM entries WHERE id = ${entryId}`;
    const row = snakeToCamel(rows)[0];
    return row ? parseEntry(row) : null;
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Entry[]> {
    const rows = await this.db`
      SELECT * FROM entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return snakeToCamel(rows).map(parseEntry);
  }

  async updateInterrogation(
    entryId: string,
    interrogation: string
  ): Promise<Entry> {
    const rows = await this.db`
      UPDATE entries
      SET interrogation = ${interrogation},
          status = 'distortions',
          updated_at = now()
      WHERE id = ${entryId}
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Entry not found');
    return parseEntry(row);
  }

  async updateDistortions(
    entryId: string,
    distortionAnalysis: string
  ): Promise<Entry> {
    const rows = await this.db`
      UPDATE entries
      SET distortion_analysis = ${distortionAnalysis},
          status = 'synthesis',
          updated_at = now()
      WHERE id = ${entryId}
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Entry not found');
    return parseEntry(row);
  }

  async updateSynthesis(entryId: string, synthesis: string): Promise<Entry> {
    const rows = await this.db`
      UPDATE entries
      SET synthesis = ${synthesis},
          status = 'synthesis',
          completed_at = now(),
          updated_at = now()
      WHERE id = ${entryId}
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Entry not found');
    return parseEntry(row);
  }

  async toggleFavorite(entryId: string, isFavorite: boolean): Promise<Entry> {
    const rows = await this.db`
      UPDATE entries
      SET is_favorite = ${isFavorite},
          updated_at = now()
      WHERE id = ${entryId}
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Entry not found');
    return parseEntry(row);
  }

  async delete(entryId: string): Promise<void> {
    await this.db`DELETE FROM entries WHERE id = ${entryId}`;
  }

  async getDashboardMetrics(userId: string): Promise<DashboardMetric> {
    const totalPromise = this.db`
      SELECT COUNT(*)::int AS count FROM entries WHERE user_id = ${userId}
    `;
    const completedPromise = this.db`
      SELECT COUNT(*)::int AS count FROM entries WHERE user_id = ${userId} AND completed_at IS NOT NULL
    `;
    const favoritePromise = this.db`
      SELECT COUNT(*)::int AS count FROM entries WHERE user_id = ${userId} AND is_favorite = true
    `;
    const topDistortionPromise = this.db`
      SELECT d.label, d.slug, COUNT(*)::int AS count
      FROM entry_distortions ed
      JOIN distortions d ON d.id = ed.distortion_id
      JOIN entries e ON e.id = ed.entry_id
      WHERE e.user_id = ${userId}
      GROUP BY d.label, d.slug
      ORDER BY count DESC
      LIMIT 1
    `;
    const byMonthPromise = this.db`
      SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM entries
      WHERE user_id = ${userId}
      GROUP BY month
      ORDER BY month
      LIMIT 12
    `;

    const [totalRows, completedRows, favoriteRows, topRows, monthRows] =
      await Promise.all([
        totalPromise,
        completedPromise,
        favoritePromise,
        topDistortionPromise,
        byMonthPromise,
      ]);

    const totalSessions = (totalRows[0]?.count as number) ?? 0;
    const completedSessions = (completedRows[0]?.count as number) ?? 0;
    const favoriteSessions = (favoriteRows[0]?.count as number) ?? 0;
    const topDistortion = topRows[0]
      ? { label: topRows[0].label as string, slug: topRows[0].slug as string, count: topRows[0].count as number }
      : undefined;
    const sessionsByMonth = (monthRows as { month: string; count: number }[]).map(
      r => ({ month: r.month, count: r.count })
    );

    return {
      totalSessions,
      completedSessions,
      favoriteSessions,
      topDistortion,
      sessionsByMonth,
    };
  }
}

export const entryRepository = new EntryRepository();
