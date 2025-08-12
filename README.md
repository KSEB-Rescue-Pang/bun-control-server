# bun-control-server
- 스마트랙 PTL 제어 
- 작업자 태스크 할당 

---

## 시작하기

### 필수 요구사항
- Docker
- Docker Compose

### 초기 설정

1. **환경 변수 설정**
  - `.env` 파일을 프로젝트 루트에 두기

2. **애플리케이션 실행**
   ```bash
   # 전체 스택 실행 (DB + Bun 서버)
   docker-compose up --build
   
   # 백그라운드 실행
   docker-compose up -d --build
   ```

3. **서버 접속 확인**
   - 서버: http://localhost:3000
   - 데이터베이스: localhost:5432

### 개발 모드 실행
```bash
# 로컬에서 Bun 설치 후 실행
bun install
bun run dev
```

---

## 데이터베이스 관리

### 데이터베이스 수정 시

1. **파일 수정**
   ```bash
   # db/schema.sql - 스키마 수정
   # db/seed.sql - 초기 데이터 수정  
   # db/csv/ - CSV 데이터 수정
   ```

2. **데이터베이스 재시작**
   ```bash
   # 컨테이너 중지 및 볼륨 삭제 (데이터 초기화)
   docker-compose down -v
   
   # 다시 시작
   docker-compose up --build
   ```

### 데이터베이스 조회 시

```bash
# 환경변수 적용
export $(cat .env | xargs)

# PostgreSQL 컨테이너에 접속
docker exec -it postgres-db psql -U $DB_USER -d $DB_NAME

# 또는 직접 접속 -- 예시
`docker exec -it postgres-db psql -U admin -d db`
```
---

## MQTT 통합

이 프로젝트는 PDA 스캔 요청 시 ESP32 하드웨어에게 MQTT를 통해 작업 할당 메시지를 전송합니다.

### MQTT 기능
- **브로커**: HiveMQ Cloud
- **프로토콜**: MQTT over TLS (포트 8883)
- **토픽**: `server/{shelf_id}/assign`
- **페이로드**: 작업자 정보 + 제품 리스트

### 환경변수 (MQTT)
```env
MQTT_BROKER_URL=your-hivemq-cluster.hivemq.cloud
MQTT_BROKER_PORT=8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
MQTT_SECURE=true
```

### MQTT 테스트
```bash
# HiveMQ WebSocket 클라이언트
# https://www.hivemq.com/demos/websocket-client/
# 구독 토픽: server/+/assign

# 스캔 API 테스트
POST http://localhost:3000/IB/1238/scan
{
  "tote_id": "TOTE-102"
}
```

### 상세 문서
- [MQTT 통합 가이드](./docs/MQTT_INTEGRATION.md)
- [API ↔ MQTT 플로우](./docs/API_MQTT_FLOW.md)

---

## 유용한 명령어

```bash
# 로그 확인
docker-compose logs -f bun
# 데이터베이스 로그 확인
docker-compose logs -f db
# 컨테이너 상태 확인
docker-compose ps
# 특정 서비스 재시작
docker-compose restart db
# 전체 정리
docker-compose down -v --remove-orphans
```
