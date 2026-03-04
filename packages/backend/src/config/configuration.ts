import { randomBytes } from 'crypto';

function generateSecret(envVar: string | undefined, label: string): string {
  if (envVar) return envVar;
  const generated = randomBytes(64).toString('hex');
  console.warn(`⚠️  ${label} not set — auto-generated. Set it in env vars for stable sessions across deploys.`);
  return generated;
}

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal',
  },
  jwt: {
    accessSecret: generateSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
    refreshSecret: generateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
});
