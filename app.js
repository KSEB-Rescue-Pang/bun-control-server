import { serve } from 'bun'
import { createConnection} from './src/db/index.js'  

serve({
  port: 3000,
  fetch(req) {
    return new Response('Not Found', { status: 404 })
  },
})
createConnection() // DB 연결

console.log('Server running at http://localhost:3000')