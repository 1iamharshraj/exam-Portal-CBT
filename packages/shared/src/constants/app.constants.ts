export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  PASSWORD_RESET: 3600000, // 1 hour in ms
};
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
};
export const RATE_LIMITS = {
  LOGIN: { ttl: 60, limit: 5 },
  FORGOT_PASSWORD: { ttl: 300, limit: 3 },
  DEFAULT: { ttl: 60, limit: 10 },
};
