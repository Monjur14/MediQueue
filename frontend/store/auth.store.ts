import { create } from 'zustand';
import { User, AuthTokens } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;

  // Actions
  login: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  hydrateFromStorage: () => void;
}

/** Backend returns `full_name` / `tenant_id`; our User type uses `name` / `tenantId`. */
function normalizeUser(raw: Record<string, unknown>): User {
  return {
    ...(raw as unknown as User),
    name:     (raw['name']     ?? raw['full_name']  ?? '') as string,
    tenantId: (raw['tenantId'] ?? raw['tenant_id']  ?? null) as string | null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  login: (tokens: AuthTokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    const user = normalizeUser(tokens.user as unknown as Record<string, unknown>);
    set({ user, accessToken: tokens.accessToken });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // silent — clear local state regardless
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null });
    window.location.href = '/login';
  },

  setUser: (user: User) => set({ user }),

  hydrateFromStorage: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      // The axios interceptor will automatically refresh the token if this
      // returns 401, then retry the request — so this always resolves with
      // fresh user data or throws if the refresh token is also expired.
      const { data } = await api.get('/auth/me');
      const raw = (data.user ?? data.data ?? data) as Record<string, unknown>;
      const user = normalizeUser(raw);

      // Read the token from localStorage AFTER the request completes — the
      // interceptor may have silently swapped in a new access token.
      const currentToken = localStorage.getItem('accessToken') ?? token;
      set({ user, accessToken: currentToken, isLoading: false });
    } catch {
      // Only reaches here when both the access token AND the refresh token
      // are invalid/expired. Clear everything and let the user log in again.
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ isLoading: false });
    }
  },
}));

// ── Role-based redirect helper ──────────────────────────────────────
export const getRoleDashboard = (role: User['role']): string => {
  switch (role) {
    case 'patient':      return '/queue';
    case 'doctor':       return '/doctor';
    case 'tenant_admin': return '/admin';
    case 'super_admin':  return '/super';
    default:             return '/login';
  }
};
