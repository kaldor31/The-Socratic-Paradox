export type WizardStep = 'thesis' | 'interrogation' | 'distortions' | 'synthesis';

export interface Question {
  id: string;
  category: string;
  slug: string;
  text: string;
}

export interface DistortionOption {
  id: string;
  slug: string;
  label: string;
  description: string;
  colorAccent: string;
  confidence: number;
  evidence: string;
}

export interface WizardSession {
  entryId: string;
  status: WizardStep;
  thesis: string;
  questions: Question[];
  answers: Record<string, string>;
  distortions: DistortionOption[];
  synthesis: string;
}

export interface WizardState {
  step: WizardStep;
  session: WizardSession;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardMetric {
  totalSessions: number;
  completedSessions: number;
  favoriteSessions: number;
  topDistortion?: { label: string; count: number };
  sessionsByMonth: Array<{ month: string; count: number }>;
}

export type WizardAction =
  | { type: 'RESET' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'INIT_SESSION'; payload: WizardSession }
  | { type: 'SET_THESIS'; payload: string }
  | { type: 'SET_ANSWER'; payload: { questionId: string; answer: string } }
  | { type: 'ADVANCE_TO_INTERROGATION'; payload: WizardSession }
  | { type: 'SET_DISTORTION'; payload: DistortionOption }
  | { type: 'ADVANCE_TO_DISTORTIONS'; payload: WizardSession }
  | { type: 'SET_SYNTHESIS'; payload: string }
  | { type: 'COMPLETE'; payload: WizardSession };
