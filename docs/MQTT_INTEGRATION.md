# MQTT 통합 가이드

## 개요

이 프로젝트는 Bun 런타임 환경에서 HiveMQ Cloud와 MQTT 통신을 구현합니다. PDA 스캔 요청 시 ESP32 하드웨어에게 작업 할당 메시지를 발송하는 시스템입니다.

## 아키텍처

```
PDA ─[HTTP]─> 서버 ─[MQTT]─> HiveMQ Cloud ─[MQTT]─> ESP32
                │
                └─[HTTP Response]─> PDA
```

## MQTT 사양

### 토픽 구조

#### 서버 → ESP32 (작업 할당)
- **토픽**: `server/{shelf_id}/assign`
- **QoS**: 1
- **Retain**: false
- **예시**: `server/A01-R02/assign`

#### ESP32 → 서버 (응답)
- **토픽**: `esp/ack`
- **QoS**: 1

### 메시지 페이로드

#### 작업 할당 메시지
```json
{
  "worker_id": "1234",
  "position": "t",
  "work_type": "IB",
  "products": [
    {
      "product_id": "2",
      "weight": "1.5",
      "quantity": 1
    }
  ]
}
```

**필드 설명:**
- `worker_id`: 작업자 ID
- `position`: 선반 위치 (`t`: 상단, `b`: 하단)
- `work_type`: 작업 유형 (`IB`: 입고, `OB`: 출고)
- `products`: 제품 배열
  - `product_id`: 제품 ID
  - `weight`: 제품 무게 (kg, 문자열)
  - `quantity`: 수량

## 환경변수 설정

```env
# .env 파일
MQTT_BROKER_URL=eda1befd200b4491bfe2b7d22b082c47.s1.eu.hivemq.cloud
MQTT_BROKER_PORT=8883
MQTT_USERNAME=skt2006
MQTT_PASSWORD=Skt32748790~
MQTT_SECURE=true
```

## 코드 구조

### MQTT 클라이언트 (`mqtt/mqtt.js`)

```javascript
import mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

// TCP/TLS 연결 옵션 (WebSocket 비활성화)
const connectOptions = {
  clientId: 'BunClient-' + uuidv4(),
  username,
  password,
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 60,
  protocol: 'mqtts',
  host,
  port,
  rejectUnauthorized: false,
};
```

### API 연동 (`src/controllers/toteController.js`)

스캔 API (`POST /{work_type}/{worker_id}/scan`) 호출 시:
1. DB에서 피킹 태스크 조회
2. `location_id` 파싱 (`A01-R02-T` → `shelf_id: A01-R02`, `position: t`)
3. MQTT 페이로드 구성
4. `server/{shelf_id}/assign` 토픽으로 발행

## 사용법

### 1. 의존성 설치
```bash
bun add mqtt uuid
```

### 2. 서버 실행
```bash
# Docker 환경
docker-compose up --build -d

# 로컬 환경
bun run dev
```

### 3. API 테스트
```bash
# 스캔 요청 (Hoppscotch 또는 curl)
POST http://localhost:3000/IB/1238/scan
Content-Type: application/json

{
  "tote_id": "TOTE-102"
}
```

### 4. MQTT 메시지 확인

#### HiveMQ WebSocket 클라이언트
- URL: `https://www.hivemq.com/demos/websocket-client/`
- Host: `eda1befd200b4491bfe2b7d22b082c47.s1.eu.hivemq.cloud`
- Port: `8884` (WebSocket Secure)
- Username/Password: 설정된 인증 정보
- 구독 토픽: `server/+/assign`

#### 터미널 구독 클라이언트
```bash
bun x mqtt_sub -h eda1befd200b4491bfe2b7d22b082c47.s1.eu.hivemq.cloud \
  -p 8883 -t "server/+/assign" \
  -u skt2006 -P "Skt32748790~" \
  --protocol mqtts -v
```

## 트러블슈팅

### Bun과 MQTT 라이브러리 호환성

**문제**: WebSocket 관련 오류 발생
```
error: Not supported yet in Bun
```

**해결**: TCP/TLS 연결만 사용
- WebSocket URL (`wss://`) 대신 MQTT over TLS (`mqtts://`) 사용
- 포트 8883 (MQTT/TLS) 사용
- `rejectUnauthorized: false` 설정으로 인증서 검증 완화

### 연결 무한루프

**문제**: 재연결 시도 무한반복
```
[MQTT] 재연결 시도 중...
[MQTT] 연결 종료
```

**해결**: 올바른 연결 옵션 사용
- `mqtt.connect(url, options)` 대신 `mqtt.connect(options)` 직접 사용
- `host`, `port` 옵션을 별도로 지정

### 메시지 발행 실패

**문제**: 클라이언트 연결 전에 발행 시도

**해결**: 연결 상태 확인 후 발행
```javascript
if (!client || !client.connected) {
  // 연결 대기 또는 재시도
}
```

## 성능 최적화

### 1. 싱글톤 클라이언트
- 전역 클라이언트 인스턴스 재사용
- 불필요한 연결 생성 방지

### 2. 연결 옵션 튜닝
- `keepalive: 60` - 연결 유지 간격
- `reconnectPeriod: 5000` - 재연결 시도 간격
- `clean: true` - 이전 세션 정리

### 3. QoS 레벨
- QoS 1 사용으로 메시지 전달 보장
- QoS 2는 불필요한 오버헤드 발생

## 모니터링

### 연결 상태 로그
```
[MQTT] 연결 시도: { host, port, protocol }
[MQTT] 연결 완료
[MQTT] esp/ack 구독 완료
```

### 메시지 발행 로그
```
[MQTT] publish 완료 → server/A01-R02/assign {"worker_id":"1234",...}
```

### 에러 로그
```
[MQTT] 오류: connection refused
[MQTT] publish 실패: client not connected
```

## 확장 계획

### 1. 추가 토픽 지원
- `server/{shelf_id}/led/on` - LED 점등
- `server/{shelf_id}/led/off` - LED 소등
- `esp/{shelf_id}/status` - 하드웨어 상태 보고

### 2. 메시지 검증
- JSON Schema 기반 페이로드 검증
- 필수 필드 존재 여부 확인

### 3. 재시도 로직
- 발행 실패 시 자동 재시도
- 지수 백오프 적용

### 4. 메트릭 수집
- 발행/수신 메시지 수 추적
- 연결 상태 모니터링
- 응답 시간 측정
