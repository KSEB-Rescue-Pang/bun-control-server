import { createConnection } from '../../../db/index.js';

/**
 * 현재 처리 대기 중인 출고 요청을 조회
 * @returns {Promise<Array>} 대기 중인 출고 요청 목록 (마감시간 순으로 정렬)
 */
export async function getPendingOutbounds() {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT outbound_id, product_id, deadline
      FROM outbound_list
      WHERE status = '대기'
      ORDER BY deadline ASC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('대기 중인 출고 요청 조회 실패:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * 상품의 재고 위치 확인
 * @param {number} productId - 상품 ID
 * @returns {Promise<Array>} 해당 상품의 진열 위치와 수량
 */
export async function checkProductStock(productId) {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT product_id, location_id, quantity
      FROM vw_products_location
      WHERE product_id = $1
      ORDER BY quantity DESC
    `;
    
    const result = await client.query(query, [productId]);
    return result.rows;
  } catch (error) {
    console.error('상품 재고 확인 실패:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * 현재 스케줄된(작업 중인) 랙 확인
 * @returns {Promise<Array>} 현재 작업 중인 랙 목록
 */
export async function getScheduledRacks() {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT location_id, work_type, assigned_worker_id, status
      FROM vw_scheduled_rack
      ORDER BY location_id
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('스케줄된 랙 조회 실패:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * 특정 위치가 스케줄되어 있는지 확인
 * @param {string} locationId - 위치 ID
 * @returns {Promise<boolean>} 스케줄 여부
 */
export async function isLocationScheduled(locationId) {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM vw_scheduled_rack
      WHERE location_id = $1
    `;
    
    const result = await client.query(query, [locationId]);
    return result.rows[0].count > 0;
  } catch (error) {
    console.error('위치 스케줄 확인 실패:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * 대기 중인 출고를 picking_tasks에 매핑 (토트 18kg 제한 적용)
 * @returns {Promise<number>} 매핑된 작업 수
 */
export async function makeOBTask() {
  const client = await createConnection();
  
  try {
    // 1. getPendingOutbounds() 활용하여 대기 중인 출고 요청 조회
    const pendingOutbounds = await getPendingOutbounds();
    
    if (pendingOutbounds.length === 0) {
      console.log('매핑할 대기 중인 출고 요청이 없습니다.');
      return 0;
    }
    
    // 2. 각 출고 요청에 대해 상품 정보와 진열 위치 조회
    let mappedCount = 0;
    let currentToteWeight = 0;
    let currentToteId = null;
    
    for (const outbound of pendingOutbounds) {
      // 상품 정보와 진열 위치 조회
      const productQuery = `
        SELECT 
          p.name as product_name,
          p.weight,
          vpl.location_id,
          vpl.quantity as available_quantity
        FROM products p
        LEFT JOIN vw_products_location vpl ON p.product_id = vpl.product_id
        WHERE p.product_id = $1
      `;
      
      const productResult = await client.query(productQuery, [outbound.product_id]);
      const product = productResult.rows[0];
      
      // 진열 위치가 없는 경우 건너뛰기
      if (!product.location_id) {
        console.log(`상품 ID ${outbound.product_id} (${product.product_name})의 진열 위치가 없어서 건너뜀`);
        continue;
      }
      
      // 3. 토트 무게 제한 확인 (18kg)
      if (currentToteWeight + product.weight > 18) {
        // 새 토트 시작
        currentToteWeight = product.weight;
        currentToteId = null; // 스캔 시점에 할당
      } else {
        // 기존 토트에 추가
        currentToteWeight += product.weight;
      }
      
      // 4. picking_tasks에 삽입
      const insertQuery = `
        INSERT INTO picking_tasks (
          tote_id,
          work_type,
          deadline,
          assigned_worker_id,
          status,
          priority,
          product_id,
          quantity,
          location_id
        ) VALUES (
          $1, 'OB', $2, NULL, '대기', $3, $4, 1, $5
        )
      `;
      
      await client.query(insertQuery, [
        currentToteId,
        outbound.deadline,
        mappedCount + 1, // 우선순위 (deadline 순)
        outbound.product_id,
        product.location_id
      ]);
      
      // 5. outbound_list 상태 업데이트
      await client.query(
        'UPDATE outbound_list SET status = $1 WHERE outbound_id = $2',
        ['매핑완료', outbound.outbound_id]
      );
      
      mappedCount++;
    }
    
    return mappedCount;
  } catch (error) {
    console.error('출고 매핑 실패:', error);
    throw error;
  } finally {
    await client.end();
  }
}