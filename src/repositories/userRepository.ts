import { sql } from '../db.js';
import type { DbClient } from '../db.js';
import { snakeToCamel } from '../utils/snakeToCamel.js';
import type { User } from '../types/index.js';

function parseUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: (row.email as string) ?? null,
    handle: (row.handle as string) ?? null,
    passwordHash: (row.passwordHash as string) ?? null,
    isAnonymous: row.isAnonymous as boolean,
    isVerified: row.isVerified as boolean,
    verificationCode: (row.verificationCode as string) ?? null,
    verificationExpiresAt: (row.verificationExpiresAt as string) ?? null,
    resetToken: (row.resetToken as string) ?? null,
    resetExpiresAt: (row.resetExpiresAt as string) ?? null,
    language: (row.language as string) ?? 'en',
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export interface CreateRegisteredUserDto {
  email: string;
  handle: string | null;
  passwordHash: string;
  verificationCode: string;
  verificationExpiresAt: string;
}

export class UserRepository {
  constructor(private readonly db: DbClient = sql) {}

  async findById(userId: string): Promise<User | null> {
    const rows = await this.db`SELECT * FROM users WHERE id = ${userId}`;
    const row = snakeToCamel(rows)[0];
    return row ? parseUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
    const row = snakeToCamel(rows)[0];
    return row ? parseUser(row) : null;
  }

  async createRegistered(dto: CreateRegisteredUserDto): Promise<User> {
    const rows = await this.db`
      INSERT INTO users (email, handle, password_hash, is_anonymous, is_verified, verification_code, verification_expires_at)
      VALUES (${dto.email}, ${dto.handle}, ${dto.passwordHash}, false, false, ${dto.verificationCode}, ${dto.verificationExpiresAt})
      RETURNING *
    `;
    const row = snakeToCamel(rows)[0];
    if (!row) throw new Error('Failed to create user');
    return parseUser(row);
  }

  async markVerified(userId: string): Promise<void> {
    await this.db`
      UPDATE users
      SET is_verified = true,
          verification_code = null,
          verification_expires_at = null,
          updated_at = now()
      WHERE id = ${userId}
    `;
  }

  async setResetToken(userId: string, token: string, expiresAt: string): Promise<void> {
    await this.db`
      UPDATE users
      SET reset_token = ${token},
          reset_expires_at = ${expiresAt},
          updated_at = now()
      WHERE id = ${userId}
    `;
  }

  async clearResetToken(userId: string): Promise<void> {
    await this.db`
      UPDATE users
      SET reset_token = null,
          reset_expires_at = null,
          updated_at = now()
      WHERE id = ${userId}
    `;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db`
      UPDATE users
      SET password_hash = ${passwordHash},
          updated_at = now()
      WHERE id = ${userId}
    `;
  }

  async updateLanguage(userId: string, language: string): Promise<void> {
    await this.db`
      UPDATE users
      SET language = ${language},
          updated_at = now()
      WHERE id = ${userId}
    `;
  }
}

export const userRepository = new UserRepository();
