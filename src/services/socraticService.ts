import { sql } from '../db.js';
import { entryRepository } from '../repositories/entryRepository.js';
import type { Entry, UpdateInterrogationDto, UpdateDistortionsDto, UpdateSynthesisDto } from '../types/index.js';

export class SocraticService {
  private async requireOwner(entryId: string, userId: string): Promise<Entry> {
    const entry = await entryRepository.findById(entryId);
    if (!entry) throw new Error('Entry not found');
    if (entry.userId !== userId) throw new Error('Forbidden');
    return entry;
  }

  async beginSession(userId: string, thesis: string): Promise<Entry> {
    return entryRepository.create({ userId, thesis });
  }

  async continueInterrogation(userId: string, dto: UpdateInterrogationDto): Promise<Entry> {
    await this.requireOwner(dto.entryId, userId);
    return entryRepository.updateInterrogation(dto.entryId, dto.interrogation);
  }

  async analyzeDistortions(userId: string, dto: UpdateDistortionsDto): Promise<Entry> {
    await this.requireOwner(dto.entryId, userId);
    const updated = await entryRepository.updateDistortions(dto.entryId, dto.distortionAnalysis);

    await sql`DELETE FROM entry_distortions WHERE entry_id = ${dto.entryId}`;
    for (const d of dto.distortions) {
      await sql`
        INSERT INTO entry_distortions (entry_id, distortion_id, confidence, evidence)
        VALUES (${dto.entryId}, ${d.distortionId}, ${Math.min(100, Math.max(0, d.confidence))}, ${d.evidence})
      `;
    }

    return updated;
  }

  async synthesize(userId: string, dto: UpdateSynthesisDto): Promise<Entry> {
    await this.requireOwner(dto.entryId, userId);
    return entryRepository.updateSynthesis(dto.entryId, dto.synthesis);
  }

  async getSession(userId: string, entryId: string): Promise<Entry> {
    return this.requireOwner(entryId, userId);
  }
}

export const socraticService = new SocraticService();
