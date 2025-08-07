import { createConnection, closeConnection } from '../../../db/index.js';

/**
 * 현재 스케줄된(작업 중인) 랙 확인 (출고 작업용)
 * @returns {Promise<Array>} 현재 작업 중인 랙 목록
 */
export async function getPickingRacks() {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT DISTINCT
        pt.location_id,
        pt.work_type,
        pt.assigned_worker_id,
        pt.status
      FROM picking_tasks pt
      WHERE pt.status IN ('대기', '진행')
        AND pt.location_id IS NOT NULL
      ORDER BY pt.work_type, pt.location_id
    `;
    
    const result = await client.query(query);
    
    console.log(`️ 현재 작업 중인 랙: ${result.rows.length}개`);
    
    // 입고/출고 작업별로 분류해서 출력
    const ibRacks = result.rows.filter(rack => rack.work_type === 'IB');
    const obRacks = result.rows.filter(rack => rack.work_type === 'OB');
    
    console.log(`  📥 입고 작업 중인 랙: ${ibRacks.length}개`);
    ibRacks.forEach((rack) => {
      console.log(`    - 랙: ${rack.location_id}, 상태: ${rack.status}, 작업자: ${rack.assigned_worker_id || '미할당'}`);
    });
    
    console.log(`  📤 출고 작업 중인 랙: ${obRacks.length}개`);
    obRacks.forEach((rack) => {
      console.log(`    - 랙: ${rack.location_id}, 상태: ${rack.status}, 작업자: ${rack.assigned_worker_id || '미할당'}`);
    });
    
    return result.rows;
    
  } finally {
    await closeConnection(client);
  }
}

// 직접 실행 시에만 호출
if (import.meta.main) {
  getPickingRacks();
}