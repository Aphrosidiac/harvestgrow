import dotenv from 'dotenv'
dotenv.config()

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret === 'change-me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
  console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production.')
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000'),
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  JWT_SECRET: jwtSecret || 'dev-secret-do-not-use-in-prod',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
}
