import { serve } from 'bun'
import { createConnection} from './db/index.js'  
import { router } from './src/routes/index.js'
import { getMqttClient } from './mqtt/mqtt.js'

serve({
  port: 3000,
  fetch(req) {
    return router(req);
  },
})
createConnection() // DB 연결

console.log('Server running at http://localhost:3000')

// MQTT 클라이언트 초기화 및 구독 설정 (esp/ack, esp/task/complete 등)
try {
  getMqttClient()
} catch (e) {
  console.error('[MQTT] 초기화 실패:', e)
}