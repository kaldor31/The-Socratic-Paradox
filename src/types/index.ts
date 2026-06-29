export type EntryStatus = 'thesis' | 'interrogation' | 'distortions' | 'synthesis';

export interface User {
  id: string;
  email?: string | null;
  handle?: string | null;
  passwordHash?: string | null;
  isAnonymous: boolean;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationExpiresAt?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  pendingEmail?: string | null;
  emailChangeCode?: string | null;
  emailChangeExpiresAt?: string | null;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Distortion {
  id: string;
  slug: string;
  label: string;
  description: string;
  colorAccent: string;
  occurrenceCount: number;
  createdAt: string;
}

export interface SocraticPrompt {
  id: string;
  category: string;
  slug: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface InterrogationItem {
  promptId: string;
  text: string;
  answer: string;
  answeredAt: string;
}

export interface DistortionAnalysisItem {
  distortionId: string;
  label: string;
  confidence: number;
  evidence: string;
}

export interface Entry {
  id: string;
  userId: string;
  thesis: string;
  interrogation: InterrogationItem[];
  distortionAnalysis: DistortionAnalysisItem[];
  synthesis?: string;
  status: EntryStatus;
  isFavorite: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocraticSession {
  entryId: string;
  status: EntryStatus;
  thesis: string;
  questions: SocraticPrompt[];
  interrogation: InterrogationItem[];
  distortions: DistortionAnalysisItem[];
  synthesis?: string;
}

export interface CreateEntryDto {
  userId: string;
  thesis: string;
}

export interface UpdateInterrogationDto {
  entryId: string;
  answers: Record<string, string>;
}

export interface UpdateDistortionsDto {
  entryId: string;
  distortions: Array<{ distortionId: string; confidence: number; evidence: string }>;
}

export interface UpdateSynthesisDto {
  entryId: string;
  synthesis: string;
}

export interface DashboardMetric {
  totalSessions: number;
  completedSessions: number;
  favoriteSessions: number;
  topDistortion?: { label: string; slug: string; count: number };
  sessionsByMonth: Array<{ month: string; count: number }>;
}
