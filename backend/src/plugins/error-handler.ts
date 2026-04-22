import { FastifyPluginAsync, FastifyError } from 'fastify'
import { randomUUID } from 'crypto'
import fp from 'fastify-plugin'

function isPrismaError(error: any): boolean {
  return error?.constructor?.name === 'PrismaClientKnownRequestError'
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: any, _request, reply) => {
    const requestId = randomUUID()

    if (isPrismaError(error)) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'field'
        fastify.log.warn({ requestId, code: error.code, target }, 'Unique constraint violation')
        return reply.status(409).send({
          success: false,
          message: `A record with this ${target} already exists`,
          requestId,
        })
      }
      if (error.code === 'P2025') {
        fastify.log.warn({ requestId, code: error.code }, 'Record not found')
        return reply.status(404).send({
          success: false,
          message: 'Record not found',
          requestId,
        })
      }
      if (error.code === 'P2003') {
        fastify.log.warn({ requestId, code: error.code }, 'Foreign key violation')
        return reply.status(409).send({
          success: false,
          message: 'Cannot delete — this record is referenced by other data',
          requestId,
        })
      }
    }

    const statusCode = (error as FastifyError).statusCode || 500
    if (statusCode >= 500) {
      fastify.log.error({ requestId, err: error }, 'Internal server error')
    } else {
      fastify.log.warn({ requestId, statusCode }, error.message)
    }

    reply.status(statusCode).send({
      success: false,
      message: error.message || 'Internal Server Error',
      requestId,
    })
  })
}

export default fp(errorHandlerPlugin)
