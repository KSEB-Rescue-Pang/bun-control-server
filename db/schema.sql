-- ===== Cleanup (drop in FK-safe order) =====
DROP VIEW IF EXISTS vw_scheduled_rack;
DROP VIEW IF EXISTS vw_products_location;
DROP VIEW IF EXISTS vw_rack_inventory;

DROP TABLE IF EXISTS tote_items CASCADE;
DROP TABLE IF EXISTS picking_tasks CASCADE;
DROP TABLE IF EXISTS outbound_list CASCADE;
DROP TABLE IF EXISTS inbound_list CASCADE;
DROP TABLE IF EXISTS totes CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ===== Domains for ID formats =====
-- Z03-R12-T  /  Z03-R12-B
CREATE DOMAIN location_id_dom AS VARCHAR(20)
  CHECK (VALUE ~ '^[A-Z][0-9]{2}-R[0-9]{2}-[TB]$');


-- ===== Products =====
CREATE TABLE products (
    product_id       SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    weight           NUMERIC(10,2) NOT NULL CHECK (weight > 0),
    length           NUMERIC(10,2) CHECK (length > 0),
    width            NUMERIC(10,2)  CHECK (width  > 0),
    height           NUMERIC(10,2) CHECK (height > 0),
    expiration_date  DATE,
    category         VARCHAR(50),
    is_stackable     BOOLEAN NOT NULL DEFAULT FALSE,
    is_fragile       BOOLEAN NOT NULL DEFAULT FALSE,
    orientation      BOOLEAN NOT NULL DEFAULT FALSE,
    danger_class     VARCHAR(20),
    turnover_rate    NUMERIC(10,2),
    seasonal_tag     VARCHAR(20),  -- 봄/여름/가을/겨울/NULL
    promotion        BOOLEAN NOT NULL DEFAULT FALSE,
    img              TEXT
);


-- ===== Workers =====
CREATE TABLE workers (
    worker_id        VARCHAR(64) PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    height           NUMERIC(5,2),
    work_type        VARCHAR(2)  NOT NULL CHECK (work_type IN ('IB','OB')),
);

-- ===== Inbound / Outbound lists (단일 주문 기준, 수량 없음) =====
CREATE TABLE inbound_list (
    inbound_id    SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    arrival_time  TIMESTAMP NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT '대기'   -- 대기/진행/완료 등
);

CREATE TABLE outbound_list (
    outbound_id   SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    deadline      TIMESTAMP NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT '대기'   -- 대기/진행/완료 등
);

-- ===== Tote items (토트 내 개별 물품 단위) =====
CREATE TABLE tote_items (
    id                SERIAL PRIMARY KEY,
    tote_id           VARCHAR(64) NOT NULL,  -- FK 제거
    product_id        INTEGER     NOT NULL REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    inbound_id        INTEGER     REFERENCES inbound_list(inbound_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    outbound_id       INTEGER     REFERENCES outbound_list(outbound_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    location_id  location_id_dom
);

-- ===== Picking tasks =====
CREATE TABLE picking_tasks (
    task_id             SERIAL PRIMARY KEY,
    tote_id             VARCHAR(64),  -- FK 제거
    work_type           VARCHAR(2)  NOT NULL CHECK ( work_type IN ('IB','OB') ),
    deadline            TIMESTAMP   NOT NULL,
    assigned_worker_id  VARCHAR(64),
    status              VARCHAR(20) NOT NULL DEFAULT '대기',
    priority            INTEGER,
    product_id          INTEGER     NOT NULL REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity            INTEGER     NOT NULL CHECK (quantity >= 0),
    location_id         location_id_dom NOT NULL,
    FOREIGN KEY (assigned_worker_id) REFERENCES workers(worker_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);


-- ===== Views =====

-- 랙(칸)별 재고
CREATE OR REPLACE VIEW vw_rack_inventory AS
SELECT
    ti.location_id,
    ti.product_id,
    COUNT(*) AS quantity
FROM tote_items ti
WHERE ti.status = '완료'
  AND ti.inbound_id IS NOT NULL  -- 진열 물품만 필터링
GROUP BY ti.location_id, ti.product_id;


-- 상품별 위치: 각 상품이 어느 칸에 몇 개 있는지
CREATE OR REPLACE VIEW vw_products_location AS
SELECT
    ti.product_id,
    ti.location_id,
    COUNT(*) AS quantity
FROM tote_items ti
WHERE ti.status = '완료'
  AND ti.inbound_id IS NOT NULL  -- 진열된 물품만 포함
GROUP BY ti.product_id, ti.location_id;


-- 현재 스케줄된(진행/대기) 랙(칸)
-- work_type에 따라 의미가 다르지만, 일관되게 picking_tasks.location_id를 사용
CREATE OR REPLACE VIEW vw_scheduled_rack AS
SELECT DISTINCT
    pt.location_id,
    pt.work_type,
    pt.assigned_worker_id,
    pt.status
FROM picking_tasks pt
WHERE pt.status IN ('진행');
