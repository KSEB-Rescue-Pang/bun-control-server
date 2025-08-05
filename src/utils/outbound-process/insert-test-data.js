import { createConnection } from '../../../db/index.js';

/**
 * 테스트용 임시 데이터 생성 (완료된 입고 작업)
 * vw_products_location 뷰가 데이터를 가질 수 있도록 함
 */
async function insertTestData() {
  const client = await createConnection();
  
  try {
    console.log('=== 테스트용 임시 데이터 생성 시작 ===');
    
    // 완료된 입고 작업 추가 (토트 ID 중복 포함)
    const insertQuery = `
      INSERT INTO picking_tasks (tote_id, work_type, deadline, assigned_worker_id, status, priority, product_id, quantity, location_id) VALUES
      ('TEMP_IB_001', 'IB', '2025-08-01 10:00:00', '1237', '완료', 1, 1, 5, 'A01-R01-T'),
      ('TEMP_IB_002', 'IB', '2025-08-01 10:00:00', '1238', '완료', 2, 2, 3, 'A01-R02-T'),
      ('TEMP_IB_003', 'IB', '2025-08-01 10:00:00', '1239', '완료', 3, 3, 8, 'A01-R03-T'),
      ('TEMP_IB_004', 'IB', '2025-08-01 10:00:00', '1240', '완료', 4, 5, 2, 'A01-R05-T'),
      ('TEMP_IB_005', 'IB', '2025-08-01 10:00:00', '1241', '완료', 5, 6, 1, 'A01-R06-T'),
      ('TEMP_IB_006', 'IB', '2025-08-01 10:00:00', '1237', '완료', 6, 7, 2, 'A01-R07-T'),
      ('TEMP_IB_007', 'IB', '2025-08-01 10:00:00', '1238', '완료', 7, 8, 3, 'A01-R08-T'),
      ('TEMP_IB_007', 'IB', '2025-08-01 10:00:00', '1238', '완료', 7, 8, 3, 'A01-R08-T'),
      ('TEMP_IB_001', 'IB', '2025-08-01 11:00:00', '1237', '완료', 8, 1, 2, 'A01-R01-T'),
      ('TEMP_IB_002', 'IB', '2025-08-01 12:00:00', '1238', '완료', 9, 2, 1, 'A01-R02-T'),
      ('TEMP_IB_003', 'IB', '2025-08-01 13:00:00', '1239', '완료', 10, 3, 3, 'A01-R03-T')
    `;
    
    const result = await client.query(insertQuery);
    console.log(`생성된 테스트 데이터: ${result.rowCount}개`);
    
    // 뷰 재생성 (캐싱 문제 해결)
    console.log('\n=== 뷰 재생성 ===');
    const recreateViewQuery = `
      DROP VIEW IF EXISTS vw_products_location;
      CREATE OR REPLACE VIEW vw_products_location AS
      SELECT product_id, location_id,
        SUM(CASE 
          WHEN work_type = 'IB' THEN quantity 
          WHEN work_type = 'OB' THEN -quantity 
          ELSE 0 
        END) AS quantity
      FROM picking_tasks
      WHERE status = '완료'
      GROUP BY product_id, location_id
      HAVING SUM(CASE 
        WHEN work_type = 'IB' THEN quantity 
        WHEN work_type = 'OB' THEN -quantity 
        ELSE 0 
      END) > 0;
    `;
    
    await client.query(recreateViewQuery);
    console.log('뷰 재생성 완료');
    
    // 뷰 데이터 확인
    const viewQuery = `SELECT * FROM vw_products_location ORDER BY product_id, location_id`;
    const viewResult = await client.query(viewQuery);
    console.log('뷰 데이터:', viewResult.rows);
    console.log('뷰 레코드 수:', viewResult.rows.length);
    
    console.log('=== 테스트용 임시 데이터 생성 완료 ===');
    
  } catch (error) {
    console.error('테스트 데이터 생성 실패:', error);
  } finally {
    await client.end();
  }
}

// 실행
insertTestData(); 