import { Elysia } from 'elysia'
import { inboundRoutes } from './src/routes/inbound'

const app = new Elysia()
  .get('/', () => ({
    message: 'Bun Control Server is running!',
    version: '1.0.0',
    endpoints: [
      'POST /api/workers/login',
      'POST /api/totes/scan',
      'POST /api/tasks/start',
      'POST /api/tasks/:task_id/complete',
      'POST /api/totes/:tote_id/return'
    ],
    timestamp: new Date().toISOString()
  }))
  .use(inboundRoutes)
  .listen(3000)

console.log('Server listening on http://localhost:3000')