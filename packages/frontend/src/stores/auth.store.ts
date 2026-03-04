import { create } from 'zustand';
import axios from 'axios';
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

export const useAuthStore = create<AuthState>((set) => ({
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
      // Use raw axios to bypass response interceptor (avoids double-refresh on 401)
      const { data: refreshData } = await axios.post(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true, validateStatus: (s) => s < 500 },
      );

      if (!refreshData?.data?.accessToken) {
        // No valid session — silently clear auth (not an error)
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const newToken = refreshData.data.accessToken;
      set({ accessToken: newToken });

      // Fetch user profile (use api instance — token is now set)
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
