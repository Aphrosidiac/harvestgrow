import dotenv from 'dotenv'
dotenv.config()

const isProd = process.env.NODE_ENV === 'production'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret === 'change-me') {
  if (isProd) {
    throw new Error('JWT_SECRET must be set in production')
  }
  console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production.')
}

if (!process.env.ANTHROPIC_API_KEY) {
  if (isProd) {
    throw new Error('ANTHROPIC_API_KEY must be set in production')
  }
  console.warn('WARNING: ANTHROPIC_API_KEY not set. AI features will be disabled.')
}

if (isProd && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN must be set in production')
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000'),
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  JWT_SECRET: jwtSecret || 'dev-secret-do-not-use-in-prod',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
}
