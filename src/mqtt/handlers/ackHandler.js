export default function handleAck({ location_id, worker_id, product_id, code }) {
    console.log(`[ACK] ${location_id} - ${product_id} by ${worker_id} → ${code}`);
    
    // 예: DB에 기록, 알림 전송, BLE 경고 등
    if (code === 'bad') {
      // 경고 처리
      console.log('경고 처리');
    }

  }
  