-- products
COPY products(product_id, name, weight, length, width, height, expiration_date, category,
              is_stackable, is_fragile, orientation, danger_class, turnover_rate, seasonal_tag, promotion, img)
FROM '/app/db/csv/products.csv' DELIMITER ',' CSV HEADER;

-- inbound_list
COPY inbound_list(inbound_id, product_id, arrival_time)
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
-- 토트 T001: 생수 500ml 5개, 탄산음료 1.5L 3개 (IB 작업자: 장보라)
('TOTE-101', 'IB', 1, 5, 'A01-R01-T', '완료', 1, '1237', '2025-07-31 10:30:00'),
('TOTE-101', 'IB', 2, 3, 'A01-R02-T', '완료', 2, '1237', '2025-07-31 10:35:00'),

-- 토트 T002: 컵라면 8개, 초콜릿 4개 (IB 작업자: 윤지호)
('TOTE-102', 'IB', 3, 8, 'A02-R01-T', '완료', 1, '1238', '2025-08-01 14:20:00'),
('TOTE-102', 'IB', 4, 4, 'A02-R02-T', '완료', 2, '1238', '2025-08-01 14:25:00'),

-- 토트 T003: 전기포트 2개, 무선청소기 1개 (IB 작업자: 서지은)
('TOTE-103', 'IB', 5, 2, 'A03-R01-T', '완료', 1, '1239', '2025-08-02 09:15:00'),
('TOTE-103', 'IB', 6, 1, 'A03-R02-T', '완료', 2, '1239', '2025-08-02 09:20:00'),

-- 토트 T004: 선풍기 3개, 전기장판 2개 (IB 작업자: 오세훈)
('TOTE-104', 'IB', 7, 3, 'A04-R01-T', '완료', 1, '1240', '2025-08-03 16:45:00'),
('TOTE-104', 'IB', 8, 2, 'A04-R02-T', '완료', 2, '1240', '2025-08-03 16:50:00'),

-- 토트 T005: 휴지 30롤 6개, 부탄가스 4개 (IB 작업자: 정다인)
('TOTE-105', 'IB', 9, 6, 'A05-R01-T', '완료', 1, '1241', '2025-08-04 11:30:00'),
('TOTE-105', 'IB', 10, 4, 'A05-R02-T', '완료', 2, '1241', '2025-08-04 11:35:00');

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