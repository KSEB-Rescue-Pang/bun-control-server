-- products
COPY products(product_id, name, weight, length, width, height, expiration_date, category,
              is_stackable, is_fragile, orientation, danger_class, turnover_rate, seasonal_tag, promotion, img)
FROM '/app/db/csv/products.csv' DELIMITER ',' CSV HEADER;

-- inbound_list
COPY inbound_list(inbound_id, product_id, arrival_time, status)
FROM '/app/db/csv/inbound_list.csv' DELIMITER ',' CSV HEADER;

-- outbound_list
COPY outbound_list(outbound_id, product_id, deadline)
FROM '/app/db/csv/outbound_list.csv' DELIMITER ',' CSV HEADER;

-- workers는 INSERT문
INSERT INTO workers (worker_id, name, height, work_type) VALUES
('1234', '김민수', 161.7, 'OB'),
('5678', '이지은', 172.5, 'OB'),
('9101', '박지훈', 181.5, 'OB'),
('1235', '최유리', 166.6, 'OB'),
('1236', '한서준', 169.0, 'OB'),
('1237', '장보라', 181.1, 'IB'),
('1238', '윤지호', 172.9, 'IB'),
('1239', '서지은', 180.8, 'IB'),
('1240', '오세훈', 179.7, 'IB'),
('1241', '정다인', 180.0, 'IB');

-- 입고 완료된 picking_tasks 데이터 (출고 테스트용 재고 생성)
INSERT INTO picking_tasks (tote_id, work_type, product_id, quantity, location_id, status, priority, assigned_worker_id, deadline) VALUES
-- 토트 TOTE-101: 생수 2개, 세탁세제 리필 3개, 물티슈 2개, 손선풍기 1개 (IB 작업자: 장보라)
('TOTE-101', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-101', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-102: 탄산음료 3개, 컵라면 4개, 두유 2개, 휴지 3개 (IB 작업자: 윤지호)
('TOTE-102', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-102', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-103: 전기포트 2개, 페브리즈 2개, 보조배터리 2개, 마스크팩 3개 (IB 작업자: 서지은)
('TOTE-103', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-103', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-104: 무선청소기 1개, 선풍기 2개, 세제 2개, 물티슈 3개 (IB 작업자: 오세훈)
('TOTE-104', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-104', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-105: 전기장판 2개, 세탁세제 3개, 무선마우스 2개, 비타민 2개 (IB 작업자: 정다인)
('TOTE-105', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-105', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-106: 선풍기 1개, 세탁세제 2개, 보조배터리 2개, 손선풍기 2개 (IB 작업자: 장보라)
('TOTE-106', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-106', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-107: 무선청소기 2개, 페브리즈 2개, 물티슈 2개, 샴푸 1개 (IB 작업자: 윤지호)  
('TOTE-107', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-107', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-108: 무선마우스 2개, 비타민 3개, 마스크팩 2개, 손선풍기 2개 (IB 작업자: 서지은)
('TOTE-108', 'IB', 1, 2, 'A01-R01-T', '대기', 1, NULL, NULL),
('TOTE-108', 'IB', 2, 2, 'A01-R02-T', '대기', 2, NULL, NULL),

-- 토트 TOTE-109: 노트북가방 3개, 샴푸 2개, 핸드크림 2개, 세제 2개 (IB 작업자: 오세훈)
('TOTE-109', 'IB', 17, 3, 'A04-R03-T', '완료', 1, '1240', '2025-08-05 18:10:00'),
('TOTE-109', 'IB', 19, 2, 'A05-R03-T', '완료', 2, '1240', '2025-08-05 18:15:00'),
('TOTE-109', 'IB', 21, 2, 'A01-R04-T', '완료', 3, '1240', '2025-08-05 18:20:00'),
('TOTE-109', 'IB', 10, 2, 'A05-R02-T', '완료', 4, '1240', '2025-08-05 18:25:00'),

-- 토트 TOTE-110: 휴대용 가스버너 5개, 세면타올 3개, 전기토스터 1개, LED 조명 1개 (IB 작업자: 정다인)
('TOTE-110', 'IB', 22, 5, 'A01-R04-B', '완료', 1, '1241', '2025-08-05 20:30:00'),
('TOTE-110', 'IB', 23, 3, 'A02-R04-T', '완료', 2, '1241', '2025-08-05 20:35:00'),
('TOTE-110', 'IB', 24, 1, 'A02-R04-B', '완료', 3, '1241', '2025-08-05 20:40:00'),
('TOTE-110', 'IB', 25, 1, 'A03-R04-T', '완료', 4, '1241', '2025-08-05 20:45:00'),

-- 토트 TOTE-111: 휴대용 가스버너 4개, 세면타올 2개, LED 조명 2개 (IB 작업자: 장보라)
('TOTE-111', 'IB', 22, 4, 'A01-R04-B', '완료', 1, '1237', '2025-08-06 11:20:00'),
('TOTE-111', 'IB', 23, 2, 'A02-R04-T', '완료', 2, '1237', '2025-08-06 11:25:00'),
('TOTE-111', 'IB', 25, 2, 'A03-R04-T', '완료', 3, '1237', '2025-08-06 11:30:00');

-- 출고 대기 중인 picking_tasks 데이터 (테스트용)
INSERT INTO picking_tasks (tote_id, work_type, product_id, quantity, location_id, status, priority, deadline) VALUES
-- 토트 T101: 생수 500ml 2개 출고
('TOTE-255', 'OB', 1, 2, 'A01-R01-T', '대기', 1, '2025-08-10 07:48:02'),

-- 토트 T102: 탄산음료 1.5L 1개, 컵라면 3개 출고  
('TOTE-256', 'OB', 2, 1, 'A01-R02-T', '대기', 1, '2025-08-09 07:48:02'),
('TOTE-257', 'OB', 3, 3, 'A02-R01-T', '대기', 2, '2025-08-09 07:48:02'),

-- 토트 T103: 전기포트 1개, 무선청소기 1개 출고
('TOTE-258', 'OB', 5, 1, 'A03-R01-T', '대기', 1, '2025-08-08 07:48:02'),
('TOTE-259', 'OB', 6, 1, 'A03-R02-T', '대기', 2, '2025-08-08 07:48:02');