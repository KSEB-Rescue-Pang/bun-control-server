import { serve } from 'bun'
import { createConnection} from './src/db/index.js'  
import { router } from './src/routes/index.js'

serve({
  port: 3000,
  fetch(req) {
    return router(req);
  },
})
createConnection() // DB 연결

console.log('Server running at http://localhost:3000')