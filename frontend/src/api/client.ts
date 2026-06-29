import type {
  CreateSessionDto,
  InterrogationDto,
  DistortionsDto,
  SynthesisDto,
  SessionResponse,
  EntriesResponse,
  DashboardResponse,
  DistortionsResponse,
  Entry,
  RegisterDto,
  LoginDto,
  VerifyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  EmailChangeRequestDto,
  EmailChangeConfirmDto,
  HandleUpdateDto,
  AuthUser,
  AuthResponse,
  MeResponse,
  UpsertJournalEntryDto,
  JournalEntryResponse,
  JournalListResponse,
} from './types';

export const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data = await res.json().catch(() => ({ ok: false, error: 'Invalid response' }));

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

export const api = {
  createSession: (dto: CreateSessionDto) =>
    request<SessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  submitInterrogation: (dto: InterrogationDto) =>
    request<SessionResponse>('/sessions/interrogation', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  submitDistortions: (dto: DistortionsDto) =>
    request<SessionResponse>('/sessions/distortions', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  submitSynthesis: (dto: SynthesisDto) =>
    request<SessionResponse>('/sessions/synthesis', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getSession: (entryId: string) =>
    request<SessionResponse>(`/sessions/${entryId}`, { method: 'GET' }),

  getEntries: () =>
    request<EntriesResponse>(`/me/entries`, { method: 'GET' }),

  getDashboard: () =>
    request<DashboardResponse>(`/me/dashboard`, { method: 'GET' }),

  getDistortions: () =>
    request<DistortionsResponse>('/distortions', { method: 'GET' }),

  deleteEntry: (entryId: string) =>
    request<{ ok: boolean }>(`/entries/${entryId}`, { method: 'DELETE' }),

  register: (dto: RegisterDto) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),

  verify: (dto: VerifyDto) =>
    request<AuthResponse>('/auth/verify', { method: 'POST', body: JSON.stringify(dto) }),

  login: (dto: LoginDto) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),

  forgotPassword: (dto: ForgotPasswordDto) =>
    request<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  resetPassword: (dto: ResetPasswordDto) =>
    request<AuthResponse>('/auth/reset-password', { method: 'POST', body: JSON.stringify(dto) }),

  getMe: () => request<MeResponse>('/auth/me', { method: 'GET' }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  updateLanguage: (language: string) =>
    request<{ ok: boolean; language: string }>('/auth/me/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    }),

  requestEmailChange: (dto: EmailChangeRequestDto) =>
    request<{ ok: boolean; message: string }>('/auth/me/email/change', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  confirmEmailChange: (dto: EmailChangeConfirmDto) =>
    request<{ ok: boolean; user: AuthUser }>('/auth/me/email/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateHandle: (dto: HandleUpdateDto) =>
    request<{ ok: boolean; user: AuthUser }>('/auth/me/handle', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  getJournalEntries: () =>
    request<JournalListResponse>('/journal', { method: 'GET' }),

  getJournalEntry: (date: string) =>
    request<JournalEntryResponse>(`/journal/${date}`, { method: 'GET' }),

  upsertJournalEntry: (dto: UpsertJournalEntryDto) =>
    request<JournalEntryResponse>('/journal', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  deleteJournalEntry: (id: string) =>
    request<{ ok: boolean }>(`/journal/${id}`, { method: 'DELETE' }),
};

export type { Entry };
