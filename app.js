import { serve } from 'bun'
import { createConnection} from './db/index.js'  
import { router } from './src/routes/index.js'
import { getMqttClient } from './mqtt/mqtt.js'

// WebSocket 연결 관리를 위한 Map
export const workerWebSockets = new Map(); // key: "workType_workerId", value: WebSocket

serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    
    // WebSocket 연결 요청 처리
    if (url.pathname.startsWith('/ws/')) {
      // URL 패턴: /ws/{work_type}/{worker_id}
      const pathParts = url.pathname.split('/');
      if (pathParts.length === 4) {
        const workType = pathParts[2];
        const workerId = pathParts[3];
        
        // WebSocket 업그레이드
        if (server.upgrade(req, {
          data: { workType, workerId, url: req.url }
        })) {
          return; // 업그레이드가 성공하면 여기서 리턴
        }
      }
    }
    
    // 일반 HTTP 요청 처리
    return router(req);
  },
  websocket: {
    message(ws, message) {
      console.log(`[WebSocket] 메시지 수신:`, message);
    },
    open(ws) {
      const { workType, workerId } = ws.data || {};
      if (workType && workerId) {
        const key = `${workType}_${workerId}`;
        
        workerWebSockets.set(key, ws);
        console.log(`[WebSocket] 연결됨: ${key}`);
        
        // 연결 확인 메시지 전송
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'WebSocket 연결 성공',
          timestamp: new Date().toISOString()
        }));
      }
    },
    close(ws, code, message) {
      // 연결 해제 시 Map에서 제거
      for (const [key, socket] of workerWebSockets.entries()) {
        if (socket === ws) {
          workerWebSockets.delete(key);
          console.log(`[WebSocket] 연결 해제됨: ${key}`);
          break;
        }
      }
    },
    error(ws, error) {
      console.error('[WebSocket] 오류:', error);
    }
  }
})
createConnection() // DB 연결

console.log('Server running at http://localhost:3000')

// MQTT 클라이언트 초기화 및 구독 설정 (esp/ack, esp/task/complete 등)
try {
  getMqttClient()
} catch (e) {
  console.error('[MQTT] 초기화 실패:', e)
}