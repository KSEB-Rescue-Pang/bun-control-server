import { serve } from 'bun'
import { createConnection} from './src/db/index.js'  

serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url)

    if (req.method === 'GET' && url.pathname === '/') {
      return new Response(
        JSON.stringify({
          message: 'Bun Control Server is running!',
          version: '1.0.0',
          endpoints: [
            'POST /api/workers/login',
            'POST /api/totes/scan',
            'POST /api/tasks/start',
            'POST /api/tasks/:task_id/complete',
            'POST /api/totes/:tote_id/return',
          ],
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Not Found', { status: 404 })
  },
})
createConnection() // DB 연결

console.log('Server running at http://localhost:3000')