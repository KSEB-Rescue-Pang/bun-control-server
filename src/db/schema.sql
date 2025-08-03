-- 기존 테이블 삭제 (순서 주의: 외래키 참조 때문에)
DROP TABLE IF EXISTS outbound_list CASCADE;
DROP TABLE IF EXISTS inbound_list CASCADE;
DROP TABLE IF EXISTS picking_tasks CASCADE;
DROP TABLE IF EXISTS tote_items CASCADE;
DROP TABLE IF EXISTS totes CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- [1] products
CREATE TABLE products (
    product_id       SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    weight           NUMERIC(10, 2) NOT NULL,
    length           NUMERIC(10, 2),
    width            NUMERIC(10, 2),
    height           NUMERIC(10, 2),
    expiration_date  DATE,
    category         VARCHAR(50),
    is_stackable     BOOLEAN DEFAULT FALSE,
    is_fragile       BOOLEAN DEFAULT FALSE,
    orientation      BOOLEAN DEFAULT FALSE,
    danger_class     VARCHAR(20),
    turnover_rate    NUMERIC(10, 2),
    seasonal_tag     VARCHAR(20),
    promotion        BOOLEAN DEFAULT FALSE,
    img              TEXT
);

-- [2] workers
CREATE TABLE workers (
    worker_id       VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    height          NUMERIC(5,2),
    workType        VARCHAR(2) NOT NULL CHECK (workType IN ('IB', 'OB'))
);

-- [3] totes
CREATE TABLE totes (
    tote_id            VARCHAR(64) PRIMARY KEY,
    assigned_worker_id VARCHAR(64),
    status             VARCHAR(20) NOT NULL,
    last_assigned_at   TIMESTAMP
);

-- [4] tote_items
CREATE TABLE tote_items (
    id                SERIAL PRIMARY KEY,
    tote_id           VARCHAR(64) NOT NULL,
    product_id        INTEGER NOT NULL,
    listed_id         INTEGER,
    from_location_id  VARCHAR(20),
    to_location_id    VARCHAR(20),
    FOREIGN KEY (tote_id) REFERENCES totes(tote_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- [5] picking_tasks
CREATE TABLE picking_tasks (
    task_id             SERIAL PRIMARY KEY,
    tote_id             VARCHAR(64) NOT NULL,
    workType            VARCHAR(2) CHECK (workType IN ('IB', 'OB')) NOT NULL,
    deadline            TIMESTAMP NOT NULL,
    assigned_worker_id  VARCHAR(64),
    status              VARCHAR(20) DEFAULT '대기',
    priority            INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    FOREIGN KEY (tote_id) REFERENCES totes(tote_id),
    FOREIGN KEY (assigned_worker_id) REFERENCES workers(worker_id)
);

-- [6] inbound_list
CREATE TABLE inbound_list (
    inbound_id     SERIAL PRIMARY KEY,
    product_id     INTEGER NOT NULL,
    arrival_time   TIMESTAMP NOT NULL,
    status         VARCHAR(20) DEFAULT '대기',
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- [7] outbound_list
CREATE TABLE outbound_list (
    outbound_id   SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL,
    deadline      TIMESTAMP NOT NULL,
    status        VARCHAR(20) DEFAULT '피킹 중',
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- [8] vw_rack_inventory
CREATE OR REPLACE VIEW vw_rack_inventory AS
SELECT
    to_location_id AS location_id,
    product_id,
    COUNT(*) AS quantity
FROM tote_items
GROUP BY to_location_id, product_id;

-- [9] vw_products_location
CREATE OR REPLACE VIEW vw_products_location AS
SELECT
    product_id,
    to_location_id AS location_id,
    COUNT(*) AS quantity
FROM tote_items
GROUP BY product_id, to_location_id;

-- [10] vw_blocked_rack
CREATE OR REPLACE VIEW vw_blocked_rack AS
SELECT DISTINCT
    CASE
        WHEN pt.workType = 'IB' THEN ti.to_location_id
        ELSE ti.from_location_id
    END AS location_id,
    pt.workType
FROM tote_items ti
JOIN picking_tasks pt ON ti.tote_id = pt.tote_id
WHERE pt.status IN ('대기', '진행');