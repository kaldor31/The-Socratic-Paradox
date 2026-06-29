import type { WizardSession, DistortionOption, DashboardMetric } from '../state/types';

export interface CreateSessionDto {
  thesis: string;
}

export interface InterrogationDto {
  entryId: string;
  answers: Record<string, string>;
}

export interface DistortionsDto {
  entryId: string;
  distortions: Array<{ distortionId: string; confidence: number; evidence: string }>;
}

export interface SynthesisDto {
  entryId: string;
  synthesis: string;
}

export interface SessionResponse {
  ok: boolean;
  session: WizardSession;
}

export interface Entry {
  id: string;
  userId: string;
  thesis: string;
  status: WizardSession['status'];
  isFavorite: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface EntriesResponse {
  ok: boolean;
  entries: Entry[];
}

export interface DashboardResponse {
  ok: boolean;
  metrics: DashboardMetric;
}

export interface DistortionsResponse {
  ok: boolean;
  distortions: DistortionOption[];
}

export interface AuthUser {
  id: string;
  email?: string | null;
  handle?: string | null;
  isAnonymous: boolean;
  isVerified: boolean;
  language: string;
  createdAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  handle?: string;
}

export interface VerifyDto {
  email: string;
  code: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface EmailChangeRequestDto {
  password: string;
  newEmail: string;
}

export interface EmailChangeConfirmDto {
  newEmail: string;
  code: string;
}

export interface HandleUpdateDto {
  handle: string;
}

export interface AuthResponse {
  ok: boolean;
  user: AuthUser;
  message?: string;
}

export interface MeResponse {
  ok: boolean;
  user: AuthUser;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryDate: string;
  answers: Record<string, string>;
  drawing?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertJournalEntryDto {
  entryDate: string;
  answers: Record<string, string>;
  drawing?: string;
}

export interface JournalEntryResponse {
  ok: boolean;
  entry: JournalEntry | null;
}

export interface JournalListResponse {
  ok: boolean;
  entries: JournalEntry[];
}
