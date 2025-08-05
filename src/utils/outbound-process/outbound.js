import { createConnection, closeConnection } from '../../../db/index.js';

/**
 * 대기 중인 출고 데이터 가져오기 (상품 정보 포함)
 * @returns {Promise<Array>} 대기 중인 출고 아이템 목록 (마감시간 순으로 정렬)
 */
export async function getWaitingOutboundItems() {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT 
        ol.outbound_id,
        ol.product_id,
        ol.deadline,
        p.name,
        p.weight,
        p.img
      FROM outbound_list ol
      JOIN products p ON ol.product_id = p.product_id
      WHERE ol.status = '대기'
      ORDER BY ol.deadline ASC
    `;
    
    const result = await client.query(query);
    
    console.log(`📦 대기 중인 출고 아이템: ${result.rows.length}개`);
    
    result.rows.forEach((item) => {
      console.log(`  - ID: ${item.outbound_id}, 상품: ${item.name}, 무게: ${item.weight}kg, 마감: ${item.deadline}`);
    });
    
    return result.rows;
    
  } finally {
    await closeConnection(client);
  }
}