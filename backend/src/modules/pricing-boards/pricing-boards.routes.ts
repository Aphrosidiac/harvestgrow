import { FastifyInstance } from 'fastify'
import {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  updateBoardStatus,
  copyBoard,
  listDailySnapshots,
  getDailySnapshot,
} from './pricing-boards.controller.js'

export default async function pricingBoardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/daily', listDailySnapshots)
  fastify.get('/daily/:date', getDailySnapshot)
  fastify.get('/', listBoards)
  fastify.get('/:id', getBoard)
  fastify.post('/', createBoard)
  fastify.put('/:id', updateBoard)
  fastify.delete('/:id', deleteBoard)
  fastify.patch('/:id/status', updateBoardStatus)
  fastify.post('/:id/copy', copyBoard)
}
