import { FastifyPluginAsync, FastifyError } from 'fastify'
import fp from 'fastify-plugin'

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error)

    const statusCode = error.statusCode || 500
    reply.status(statusCode).send({
      success: false,
      message: error.message || 'Internal Server Error',
    })
  })
}

export default fp(errorHandlerPlugin)
