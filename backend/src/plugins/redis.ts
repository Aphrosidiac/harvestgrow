import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import Redis from 'ioredis'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
    cache: {
      get: <T>(key: string) => Promise<T | null>
      set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>
      del: (key: string | string[]) => Promise<void>
      invalidate: (pattern: string) => Promise<void>
    }
  }
}

const DEFAULT_TTL = 60 // 1 minute

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  await redis.connect()
  fastify.log.info('Redis connected')

  // Cache helper
  const cache = {
    async get<T>(key: string): Promise<T | null> {
      const data = await redis.get(key)
      if (!data) return null
      return JSON.parse(data) as T
    },

    async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    },

    async del(key: string | string[]): Promise<void> {
      const keys = Array.isArray(key) ? key : [key]
      if (keys.length > 0) await redis.del(...keys)
    },

    async invalidate(pattern: string): Promise<void> {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(...keys)
    },
  }

  fastify.decorate('redis', redis)
  fastify.decorate('cache', cache)

  fastify.addHook('onClose', async () => {
    await redis.quit()
  })
}

export default fp(redisPlugin)
