import { journalRepository } from '../repositories/journalRepository.js';
import type { JournalEntry, UpsertJournalEntryDto } from '../types/index.js';

class JournalService {
  async upsert(userId: string, dto: UpsertJournalEntryDto): Promise<JournalEntry> {
    return journalRepository.upsert(userId, dto);
  }

  async getByDate(userId: string, entryDate: string): Promise<JournalEntry | null> {
    return journalRepository.findByDate(userId, entryDate);
  }

  async list(userId: string): Promise<JournalEntry[]> {
    return journalRepository.findByUserId(userId);
  }

  async delete(userId: string, entryId: string): Promise<void> {
    const entry = await journalRepository.findById(entryId);
    if (!entry) {
      const err = new Error('Journal entry not found') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    if (entry.userId !== userId) {
      const err = new Error('Forbidden') as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }
    await journalRepository.delete(entryId);
  }
}

export const journalService = new JournalService();
