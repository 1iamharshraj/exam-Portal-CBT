import { create } from 'zustand';
import type { IUser, ILoginRequest } from '@exam-portal/shared';
import api from '@/lib/api';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: ILoginRequest) => Promise<IUser>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: ILoginRequest) => {
    const { data } = await api.post('/auth/login', credentials);
    const { user, accessToken } = data.data;

    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });

    return user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout even if API fails
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      // Try to refresh token using httpOnly cookie
      const { data: refreshData } = await api.post('/auth/refresh');
      const newToken = refreshData.data.accessToken;

      set({ accessToken: newToken });

      // Fetch user profile
      const { data: userData } = await api.get('/auth/me');
      set({
        user: userData.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setAccessToken: (token: string) => {
    set({ accessToken: token });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
