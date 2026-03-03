export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    BULK_IMPORT: '/users/bulk-import',
    IMPORT_TEMPLATE: '/users/import-template',
  },
  BATCHES: {
    BASE: '/batches',
    BY_ID: (id: string) => `/batches/${id}`,
  },
} as const;
