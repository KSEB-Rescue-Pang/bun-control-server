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
('9334-4300', '김민수', 161.7, 'OB'),
('8667-2188', '이지은', 172.5, 'OB'),
('4187-5025', '박지훈', 181.5, 'OB'),
('9109-6673', '최유리', 166.6, 'OB'),
('6005-3293', '한서준', 169.0, 'OB'),
('3312-9935', '장보라', 181.1, 'IB'),
('3022-4300', '윤지호', 172.9, 'IB'),
('1605-1103', '서지은', 180.8, 'IB'),
('1460-7652', '오세훈', 179.7, 'IB'),
('1202-2462', '정다인', 180.0, 'IB');