-- products
COPY products(product_id, name, weight, length, width, height, expiration_date, category,
              is_stackable, is_fragile, orientation, danger_class, turnover_rate, seasonal_tag, promotion, img)
FROM '/Users/kunwoopark/WS/KSEB-bootCamp/bun-control-server/src/db/csv/products.csv' DELIMITER ',' CSV HEADER;

-- inbound_list
COPY inbound_list(inbound_id, product_id, arrival_time, status)
FROM '/Users/kunwoopark/WS/KSEB-bootCamp/bun-control-server/src/db/csv/inbound_list.csv' DELIMITER ',' CSV HEADER;

-- outbound_list
COPY outbound_list(outbound_id, product_id, deadline, status)
FROM '/Users/kunwoopark/WS/KSEB-bootCamp/bun-control-server/src/db/csv/outbound_list.csv' DELIMITER ',' CSV HEADER;

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