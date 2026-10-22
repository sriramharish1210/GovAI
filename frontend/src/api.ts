import type { 
  User, 
  StudentProfile, 
  NotificationPreference, 
  Scheme, 
  RecommendationResult, 
  ChatMessage, 
  ChatSession, 
  Bookmark, 
  Application, 
  Reminder, 
  APIResponse 
} from '../../shared/types';

const API_BASE = '/api/v1';

let authToken: string | null = localStorage.getItem('govai_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('govai_token', token);
  } else {
    localStorage.removeItem('govai_token');
  }
};

export const getAuthToken = () => authToken;

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const failure = <T,>(code: string, message: string): APIResponse<T> => ({
  success: false,
  data: null,
  error: { code, message },
});

/** Unwrap an APIResponse, throwing ApiError on failure. */
export function unwrap<T>(res: APIResponse<T>): T {
  if (!res.success || res.data === null || res.data === undefined) {
    throw new ApiError(res.error?.code ?? 'UNKNOWN', res.error?.message ?? 'Something went wrong. Please try again.');
  }
  return res.data;
}

/** Message suitable for showing to a user from any thrown value. */
export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof Error && e.message ? e.message : fallback;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    return failure('NETWORK_ERROR', 'Cannot reach the GovAI server. Check your connection and try again.');
  }

  if (res.status === 401 && authToken) {
    setAuthToken(null);
    window.dispatchEvent(new Event('govai:unauthorized'));
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return failure(
      res.ok ? 'INVALID_RESPONSE' : `HTTP_${res.status}`,
      res.ok ? 'The server sent an unexpected response.' : `The server returned an error (${res.status}).`
    );
  }

  try {
    return (await res.json()) as APIResponse<T>;
  } catch {
    return failure('INVALID_RESPONSE', 'The server sent an unreadable response.');
  }
}

export const api = {
  // Auth
  mockAuth: (username: string) => request<{ token: string; user: User & { hasProfile: boolean } }>('/auth/mock', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),
  googleAuth: (idToken: string) => request<{ token: string; user: User & { hasProfile: boolean } }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // Health
  getHealth: () => request<{ status: string; database: string; ai: string }>('/health'),

  // Profile
  getProfile: () => request<{ name: string; email: string; avatarUrl: string; profile: StudentProfile; notificationPreference: NotificationPreference }>('/profile'),
  upsertProfile: (profileData: Partial<StudentProfile> & { name: string }) => request<StudentProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),
  updatePreferences: (prefData: Partial<NotificationPreference>) => request<NotificationPreference>('/profile/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefData),
  }),

  // Schemes
  getSchemes: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ schemes: Scheme[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/schemes?${query}`);
  },
  getSchemeById: (id: string) => request<Scheme>(`/schemes/${id}`),

  // Recommendations
  getRecommendations: (explain = false, status?: string) => {
    const params = new URLSearchParams();
    if (explain) params.set('explain', 'true');
    if (status) params.set('status', status);
    return request<{ hasProfile: boolean; total: number; recommendations: RecommendationResult[] }>(`/recommendations?${params.toString()}`);
  },

  // Comparison
  compareSchemes: (schemeIds: string[]) => request<Scheme[]>('/comparison', {
    method: 'POST',
    body: JSON.stringify({ schemeIds }),
  }),

  // Chat
  getChatSessions: () => request<ChatSession[]>('/chat/sessions'),
  createChatSession: (title?: string) => request<ChatSession>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  renameChatSession: (sessionId: string, title: string) => request<ChatSession>(`/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }),
  deleteChatSession: (sessionId: string) => request<{ message: string }>(`/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  }),
  getChatMessages: (sessionId: string) => request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`),
  sendChatMessage: (sessionId: string, message: string) => request<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // Bookmarks
  getBookmarks: () => request<Scheme[]>('/bookmarks'),
  addBookmark: (schemeId: string) => request<Bookmark>('/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ schemeId }),
  }),
  removeBookmark: (schemeId: string) => request<{ message: string }>(`/bookmarks/${schemeId}`, {
    method: 'DELETE',
  }),

  // Applications
  getApplications: () => request<Application[]>('/applications'),
  upsertApplication: (appData: { schemeId: string; status: string; notes?: string; appliedAt?: string }) => request<Application>('/applications', {
    method: 'POST',
    body: JSON.stringify(appData),
  }),

  // Reminders
  getReminders: () => request<Reminder[]>('/reminders'),
  createReminder: (schemeId: string, daysBefore: number) => request<Reminder>('/reminders', {
    method: 'POST',
    body: JSON.stringify({ schemeId, daysBefore }),
  }),
  deleteReminder: (id: string) => request<{ message: string }>(`/reminders/${id}`, {
    method: 'DELETE',
  }),
  triggerReminderProcess: () => request<{ message: string; summary: { processed: number; sent: number; errors: number } }>('/reminders/process', {
    method: 'POST',
  }),

  // Reports
  getReportsHistory: () => request<any[]>('/reports'),
  downloadReport: async () => {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers,
    });
    if (res.status === 401) {
      setAuthToken(null);
      window.dispatchEvent(new Event('govai:unauthorized'));
      throw new ApiError('UNAUTHORIZED', 'Your session has expired. Please sign in again.');
    }
    if (!res.ok) {
      let message = 'Could not generate the report. Please complete your profile first.';
      try { message = (await res.json())?.error?.message ?? message; } catch { /* keep default message */ }
      throw new ApiError('REPORT_FAILED', message);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GovAI_Report_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
  },

  // Explanations
  explainTerm: (term: string, context?: string) => request<{ term: string; explanation: string }>('/explanations/term', {
    method: 'POST',
    body: JSON.stringify({ term, context }),
  }),
  summarizeScheme: (id: string) => request<{ schemeId: string; schemeName: string; summary: string }>(`/explanations/scheme/${id}`),
};
