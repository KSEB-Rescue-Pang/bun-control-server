import { createConnection } from '../db/index.js';

/**
 * 간단한 토트박스 패킹 함수
 */
export const packAllInboundItems = async () => {
  let client;
  
  try {
    client = await createConnection();
    const results = [];

    // 20개 토트박스만 사용
    for (let i = 1; i <= 20; i++) {
      const toteId = `TOTE${String(i).padStart(3, '0')}`;
      
      // 1. 대기 중인 아이템 확인
      const pendingQuery = `
        SELECT il.inbound_id, il.product_id, p.name, p.weight, p.category
        FROM inbound_list il
        JOIN products p ON il.product_id = p.product_id
        WHERE il.status = '대기'
        ORDER BY il.arrival_time ASC
        LIMIT 20
      `;
      
      const pendingResult = await client.query(pendingQuery);
      const pendingItems = pendingResult.rows;
      
      if (pendingItems.length === 0) {
        console.log('더 이상 대기 중인 아이템이 없습니다.');
        break;
      }

      // 2. 18kg 될 때까지 담기
      let currentWeight = 0;
      let selectedItems = [];
      
      for (const item of pendingItems) {
        const weight = parseFloat(item.weight);
        if (currentWeight + weight <= 18.0) {
          selectedItems.push(item);
          currentWeight += weight;
        }
      }

      if (selectedItems.length === 0) {
        console.log(`토트박스 ${toteId}: 담을 수 있는 아이템 없음`);
        continue;
      }

      // 3. DB에 저장
      await client.query('BEGIN');
      
      for (let j = 0; j < selectedItems.length; j++) {
        const item = selectedItems[j];
        
        // 간단한 위치 할당: A01~A80 순차
        const rackNumber = String((i - 1) * 4 + j + 1).padStart(2, '0');
        const toLocation = `A${rackNumber}-R01-B1`;
        
        // tote_items에 삽입
        await client.query(`
          INSERT INTO tote_items (tote_id, product_id, listed_id, to_location_id)
          VALUES ($1, $2, $3, $4)
        `, [toteId, item.product_id, item.inbound_id, toLocation]);
        
        // inbound_list 상태 변경
        await client.query(`
          UPDATE inbound_list SET status = '처리중' WHERE inbound_id = $1
        `, [item.inbound_id]);
      }
      
      // totes 테이블 업데이트
      await client.query(`
        INSERT INTO totes (tote_id, status, last_assigned_at)
        VALUES ($1, '준비완료', NOW())
        ON CONFLICT (tote_id) DO UPDATE SET status = '준비완료'
      `, [toteId]);
      
      await client.query('COMMIT');

      // 4. 결과 리스트
      const result = {
        tote_id: toteId,
        packed_count: selectedItems.length,
        total_weight: currentWeight.toFixed(2),
        items: selectedItems.map((item, idx) => ({
          product_id: item.product_id,
          name: item.name,
          weight: item.weight,
          to_location: `A${String((i - 1) * 4 + idx + 1).padStart(2, '0')}-R01-B1`
        }))
      };
      
      results.push(result);
      console.log(`✅ ${toteId}: ${selectedItems.length}개 (${currentWeight.toFixed(2)}kg)`);
    }

    return {
      success: true,
      total_totes: results.length,
      results: results
    };

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('에러:', error);
    return { success: false, error: error.message };
  } finally {
    if (client) await client.end();
  }
};

/**
 * 단일 토트박스 패킹
 */
export const packSingleTote = async (toteId) => {
  let client;
  
  try {
    client = await createConnection();

    // 대기 중인 아이템 가져오기
    const items = await client.query(`
      SELECT il.inbound_id, il.product_id, p.name, p.weight
      FROM inbound_list il
      JOIN products p ON il.product_id = p.product_id
      WHERE il.status = '대기'
      ORDER BY il.arrival_time ASC
      LIMIT 10
    `);

    // 18kg까지 담기
    let weight = 0;
    let selected = [];
    
    for (const item of items.rows) {
      if (weight + parseFloat(item.weight) <= 18.0) {
        selected.push(item);
        weight += parseFloat(item.weight);
      }
    }

    if (selected.length === 0) {
      return { success: false, message: '담을 아이템 없음' };
    }

    // DB 저장
    await client.query('BEGIN');
    
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const location = `A${String(i + 1).padStart(2, '0')}-R01-B1`;
      
      await client.query(`
        INSERT INTO tote_items (tote_id, product_id, listed_id, to_location_id)
        VALUES ($1, $2, $3, $4)
      `, [toteId, item.product_id, item.inbound_id, location]);
      
      await client.query(`
        UPDATE inbound_list SET status = '처리중' WHERE inbound_id = $1
      `, [item.inbound_id]);
    }
    
    await client.query('COMMIT');

    return {
      success: true,
      tote_id: toteId,
      count: selected.length,
      weight: weight.toFixed(2),
      items: selected
    };

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    if (client) await client.end();
  }
}; 