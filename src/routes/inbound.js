// src/routes/inbound.js
import { Elysia } from 'elysia'
import {
  loginWorker,
  scanTote,
  startTask,
  completeTask,
  returnTote
} from '../controllers/inbound'

export const inboundRoutes = new Elysia()
  .post('/api/workers/login', loginWorker)
  .post('/api/totes/scan', scanTote)
  .post('/api/tasks/start', startTask)
  .post('/api/tasks/:task_id/complete', completeTask)
  .post('/api/totes/:tote_id/return', returnTote)