import mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

const host = process.env.MQTT_BROKER_URL;
const port = Number(process.env.MQTT_BROKER_PORT);
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;

let singletonClient;

function ensureClient() {
  if (singletonClient && singletonClient.connected) return singletonClient;

  if (!host || !port) {
    throw new Error('MQTT 환경변수(MQTT_BROKER_URL, MQTT_BROKER_PORT)가 설정되지 않았습니다.');
  }

  const clientId = 'BunClient-' + uuidv4();
  
  // TCP 연결만 사용 (WebSocket 비활성화)
  const connectOptions = {
    clientId,
    username,
    password,
    clean: true,
    reconnectPeriod: 5000,
    keepalive: 60,
    protocol: 'mqtts',
    host,
    port,
    rejectUnauthorized: false, // 자체 서명 인증서 허용
  };

  console.log('[MQTT] 연결 시도:', { host, port, protocol: 'mqtts' });
  
  singletonClient = mqtt.connect(connectOptions);

  singletonClient.on('connect', () => {
    console.log('[MQTT] 연결 완료');
    singletonClient.subscribe('esp/ack', { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] esp/ack 구독 실패:', err);
      } else {
        console.log('[MQTT] esp/ack 구독 완료');
      }
    });
  });

  singletonClient.on('reconnect', () => console.log('[MQTT] 재연결 시도 중...'));
  singletonClient.on('close', () => console.log('[MQTT] 연결 종료'));
  singletonClient.on('offline', () => console.log('[MQTT] 오프라인'));
  singletonClient.on('error', (err) => console.error('[MQTT] 오류:', err.message));

  singletonClient.on('message', async (topic, message) => {
    if (topic === 'esp/ack') {
      try {
        const data = JSON.parse(message.toString());
        console.log('[MQTT] esp/ack 수신:', data);
      } catch (e) {
        console.error('[MQTT] esp/ack JSON 파싱 오류:', e);
      }
    }
  });

  return singletonClient;
}

export function getMqttClient() {
  return ensureClient();
}

export function publishAssignToShelf(shelfId, payload, { qos = 1, retain = false } = {}) {
  return new Promise((resolve, reject) => {
    const client = ensureClient();
    
    if (!client) {
      return reject(new Error('MQTT 클라이언트를 생성할 수 없습니다.'));
    }

    const topic = `server/${shelfId}/assign`;
    const message = JSON.stringify(payload);

    client.publish(topic, message, { qos, retain }, (err) => {
      if (err) {
        console.error('[MQTT] publish 실패:', err);
        return reject(err);
      }
      console.log(`[MQTT] publish 완료 → ${topic}`, message);
      resolve();
    });
  });
}