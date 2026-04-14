import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import os from 'os'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  // In cluster mode, each worker gets its own pool.
  // Total DB connections = pool_size × num_workers.
  // PostgreSQL default max_connections = 100.
  // Reserve ~10 for admin/migrations, split the rest across workers.
  const cpuCount = os.cpus().length
  const poolSize = Math.max(2, Math.floor(80 / cpuCount))

  const databaseUrl = new URL(process.env.DATABASE_URL!)
  databaseUrl.searchParams.set('connection_limit', String(poolSize))
  databaseUrl.searchParams.set('pool_timeout', '10')

  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl.toString() },
    },
  })

  await prisma.$connect()
  fastify.log.info(`Prisma connected (pool: ${poolSize} per worker, PID: ${process.pid})`)

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin)
