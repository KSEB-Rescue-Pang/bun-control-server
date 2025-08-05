import { createConnection, closeConnection } from '../../../db/index.js';

/**
 * 대기 중인 출고 데이터 가져오기 (상품 정보 포함)
 * @returns {Promise<Array>} 대기 중인 출고 아이템 목록 (마감시간 순으로 정렬)
 */
export async function getOutboundList() {
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

/**
 * 출고 아이템들을 18kg 제한으로 토트에 할당
 * @param {Array} outboundItems - 출고 아이템 목록
 * @returns {Array} 토트별로 할당된 아이템 목록
 */
export function assignOutboundToteBoxes(outboundItems) {
  const totes = [];
  let currentTote = {
    tote_id: null,
    items: [],
    totalWeight: 0,
  };
  let toteNumber = 1;

  // 아이템들을 18kg 이하로 토트에 할당
  for (const item of outboundItems) {
    const itemWeight = parseFloat(item.weight.toString()) || 0;
    
    // 18kg 초과하면 새 토트 시작
    if (currentTote.totalWeight + itemWeight > 18) {
      // 현재 토트가 비어있지 않으면 저장
      if (currentTote.items.length > 0) {
        currentTote.tote_id = `출고대기${toteNumber}`;
        totes.push({ ...currentTote });
        toteNumber++;
      }
      
      // 새 토트 시작
      currentTote = {
        tote_id: `출고대기${toteNumber}`,
        items: [item],
        totalWeight: itemWeight
      };
    } else {
      // 기존 토트에 추가
      currentTote.items.push(item);
      currentTote.totalWeight += itemWeight;
    }
  }

  // 마지막 토트 추가
  if (currentTote.items.length > 0) {
    currentTote.tote_id = `출고대기${toteNumber}`;
    totes.push(currentTote);
  }

  console.log(`📦 출고 토트 할당 완료: ${totes.length}개 토트`);
  totes.forEach((tote, index) => {
    console.log(`  - ${tote.tote_id}: ${tote.items.length}개 아이템, ${tote.totalWeight}kg`);
  });

  return totes;
}

/**
 * 토트 아이템들을 tote_items 테이블에 저장
 * @param {Array} totes - 토트 목록
 */
export async function saveOutboundToteItems(totes) {
  const client = await createConnection();
  
  try {
    for (const tote of totes) {
      console.log(`�� 토트 ${tote.tote_id}에 ${tote.items.length}개 아이템 저장 중...`);
      
      for (const item of tote.items) {
        const insertQuery = `
          INSERT INTO tote_items (tote_id, product_id, outbound_id)
          VALUES ($1, $2, $3)
        `;
        
        await client.query(insertQuery, [
          tote.tote_id,
          item.product_id,
          item.outbound_id
        ]);
        
        console.log(`  - 저장: 토트=${tote.tote_id}, 상품ID=${item.product_id}, 출고ID=${item.outbound_id}`);
      }
    }
    
    console.log(`✅ 총 ${totes.length}개 토트의 아이템 저장 완료`);
    
  } finally {
    await closeConnection(client);
  }
}


/**
 * 토트 아이템들을 tote_items 테이블에 저장
 * @param {Array} totes - 토트 목록
 */
export async function saveOutboundToteItems(totes) {
  const client = await createConnection();
  
  try {
    for (const tote of totes) {
      console.log(`�� 토트 ${tote.tote_id}에 ${tote.items.length}개 아이템 저장 중...`);
      
      for (const item of tote.items) {
        const insertQuery = `
          INSERT INTO tote_items (tote_id, product_id, outbound_id)
          VALUES ($1, $2, $3)
        `;
        
        await client.query(insertQuery, [
          tote.tote_id,
          item.product_id,
          item.outbound_id
        ]);
        
        console.log(`  - 저장: 토트=${tote.tote_id}, 상품ID=${item.product_id}, 출고ID=${item.outbound_id}`);
      }
    }
    
    console.log(`✅ 총 ${totes.length}개 토트의 아이템 저장 완료`);
    
  } finally {
    await closeConnection(client);
  }
}

/**
 * 출고 아이템들을 18kg 제한으로 토트에 할당하고 DB에 저장
 * @returns {Promise<Array>} 할당된 토트 목록
 */
export async function processOutboundToteAssignment() {
  // 1. getOutboundList() 사용해서 대기 중인 출고 아이템 가져오기
  const outboundItems = await getOutboundList();
  
  if (outboundItems.length === 0) {
    console.log('📦 처리할 대기 중인 출고 아이템이 없습니다.');
    return [];
  }
  
  // 2. 토트에 할당
  const totes = assignOutboundToteBoxes(outboundItems);
  
  // 3. DB에 저장
  await saveOutboundToteItems(totes);
  
  return totes;
}

processOutboundToteAssignment()