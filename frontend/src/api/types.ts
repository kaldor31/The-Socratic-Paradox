import type { WizardSession, DistortionOption, DashboardMetric } from '../state/types';

export interface CreateSessionDto {
  thesis: string;
}

export interface InterrogationDto {
  entryId: string;
  // encrypted JSON string of InterrogationItem[]
  interrogation: string;
}

export interface DistortionsDto {
  entryId: string;
  // encrypted JSON string of DistortionAnalysisItem[]
  distortionAnalysis: string;
  distortions: Array<{ distortionId: string; confidence: number; evidence: string }>;
}

export interface SynthesisDto {
  entryId: string;
  // encrypted text
  synthesis: string;
}

export interface SessionResponse {
  ok: boolean;
  entry: EncryptedEntry;
}

export interface EncryptedEntry {
  id: string;
  userId: string;
  // encrypted fields
  thesis: string;
  interrogation: string;
  distortionAnalysis: string;
  synthesis?: string;
  status: WizardSession['status'];
  isFavorite: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntriesResponse {
  ok: boolean;
  entries: EncryptedEntry[];
}

export interface DashboardResponse {
  ok: boolean;
  metrics: DashboardMetric;
}

export interface DistortionsResponse {
  ok: boolean;
  distortions: DistortionOption[];
}

export interface Prompt {
  id: string;
  category: string;
  slug: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface PromptsResponse {
  ok: boolean;
  prompts: Prompt[];
}

export interface KeyResponse {
  ok: boolean;
  encryptionSalt: string;
  encryptedDataKey: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  handle?: string | null;
  encryptionSalt?: string | null;
  encryptedDataKey?: string | null;
  isAnonymous: boolean;
  isVerified: boolean;
  language: string;
  createdAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  handle?: string;
  encryptionSalt: string;
  encryptedDataKey: string;
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
  encryptedDataKey: string;
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
  // encrypted JSON string
  answers: string;
  // encrypted PNG data URL
  drawing?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertJournalEntryDto {
  entryDate: string;
  // encrypted JSON string
  answers: string;
  // encrypted PNG data URL
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
