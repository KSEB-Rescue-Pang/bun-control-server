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
      WHERE pt.status = '진행'
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

/**
 * 출고용 토트 아이템들을 가져오기
 * @returns {Promise<Array>} 출고용 토트 아이템 목록
 */
export async function getOutboundToteItems() {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT 
        ti.tote_id,
        ti.product_id,
        ti.outbound_id,
        ti.location_id,
        p.name as product_name,
        p.weight
      FROM tote_items ti
      JOIN products p ON ti.product_id = p.product_id
      WHERE ti.outbound_id IS NOT NULL
        AND ti.location_id IS NOT NULL
        AND ti.tote_id LIKE 'OUT-TOTE-%'
      ORDER BY ti.tote_id, ti.location_id
    `;
    
    const result = await client.query(query);
    
    console.log(`📦 출고용 토트 아이템: ${result.rows.length}개`);
    
    // 토트별로 그룹화해서 출력
    const toteGroups = {};
    result.rows.forEach((item) => {
      if (!toteGroups[item.tote_id]) {
        toteGroups[item.tote_id] = [];
      }
      toteGroups[item.tote_id].push(item);
    });
    
    Object.keys(toteGroups).forEach((toteId) => {
      console.log(`  - ${toteId}: ${toteGroups[toteId].length}개 아이템`);
    });
    
    return result.rows;
    
  } finally {
    await closeConnection(client);
  }
}

/**
 * 아이템들을 location-product_id로 그룹화하여 태스크 생성
 * @param {Array} items - 토트 아이템 목록
 * @returns {Array} 그룹화된 태스크 목록
 */
function groupItemsByLocationAndProduct(items) {
  const taskMap = new Map();
  
  items.forEach(item => {
    if (!item.location_id) return; // location이 없는 아이템은 제외
    
    const key = `${item.location_id}-${item.product_id}`;
    const existingTask = taskMap.get(key);
    
    if (existingTask) {
      // 같은 location-product_id 조합이면 수량만 추가
      taskMap.set(key, {
        ...existingTask,
        quantity: existingTask.quantity + 1
      });
    } else {
      // 새로운 태스크 생성
      taskMap.set(key, {
        product_id: item.product_id,
        quantity: 1,
        location_id: item.location_id
      });
    }
  });
  
  return Array.from(taskMap.values());
}

/**
 * location_id에서 랙 번호 추출
 * 예: A01-R01-T -> 1, A01-R15-B -> 15
 * @param {string} locationId - 위치 ID
 * @returns {number} 랙 번호
 */
function extractRackNumber(locationId) {
  const match = locationId.match(/R(\d+)/);
  return match && match[1] ? parseInt(match[1], 10) : 999;
}

/**
 * location이 scheduledRack에 포함되어 있는지 확인
 * @param {string} locationId - 위치 ID
 * @param {Array} scheduledRack - 스케줄된 랙 목록
 * @returns {boolean} 포함 여부
 */
function isLocationInScheduledRack(locationId, scheduledRack) {
  return scheduledRack.includes(locationId);
}

/**
 * 태스크들을 location 가까움에 따라 정렬하되,
 * scheduledRack에 포함된 location은 맨 뒤로 미는 함수
 * @param {Array} tasks - 태스크 목록
 * @param {Array} scheduledRack - 스케줄된 랙 목록
 * @returns {Array} 정렬된 태스크 목록
 */
function sortTasksByLocation(tasks, scheduledRack) {
  return tasks.sort((a, b) => {
    // 랙 번호 추출 (A01-R01-T -> R01)
    const rackA = extractRackNumber(a.location_id);
    const rackB = extractRackNumber(b.location_id);

    // scheduledRack 포함 여부 확인
    const isAScheduled = isLocationInScheduledRack(a.location_id, scheduledRack);
    const isBScheduled = isLocationInScheduledRack(b.location_id, scheduledRack);

    // 1. scheduledRack에 포함된 것은 맨 뒤로
    if (isAScheduled && !isBScheduled) return 1;  // A를 뒤로
    if (!isAScheduled && isBScheduled) return -1; // B를 뒤로

    // 2. 둘 다 scheduled이거나 둘 다 scheduled가 아닌 경우, 랙 번호로 정렬
    return rackA - rackB;
  });
}

/**
 * 출고용 피킹 태스크 생성
 * @param {Array} scheduledRack - 스케줄된 랙 목록
 * @param {Array} toteItems - 토트 아이템 목록
 * @returns {Array} 피킹 태스크 목록
 */
export function createOutboundPickingTasks(scheduledRack, toteItems) {
  const allTasks = [];
  
  // 토트별로 그룹화
  const toteGroups = {};
  toteItems.forEach((item) => {
    if (!toteGroups[item.tote_id]) {
      toteGroups[item.tote_id] = [];
    }
    toteGroups[item.tote_id].push(item);
  });
  
  Object.keys(toteGroups).forEach((toteId) => {
    const items = toteGroups[toteId];
    
    // 토트 내 아이템들을 location-product_id로 그룹화
    const groupedItems = groupItemsByLocationAndProduct(items);
    
    // 그룹화된 태스크들을 동선 최적화 순서로 정렬
    const sortedTasks = sortTasksByLocation(groupedItems, scheduledRack);
    
    // 각 태스크에 우선순위 부여
    sortedTasks.forEach((task, index) => {
      allTasks.push({
        ...task,
        tote_id: toteId,
        work_type: 'OB',
        priority: index + 1
      });
    });
  });
  
  console.log(`📦 출고 피킹 태스크 생성 완료: ${allTasks.length}개`);
  
  return allTasks;
}

/**
 * 피킹 태스크를 DB에 저장
 * @param {Array} tasks - 피킹 태스크 목록
 */
export async function saveOutboundPickingTasks(tasks) {
  const client = await createConnection();
  
  try {
    const query = `
      INSERT INTO picking_tasks (tote_id, work_type, product_id, quantity, location_id, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, '대기')
    `;
    
    for (const task of tasks) {
      await client.query(query, [
        task.tote_id, 
        task.work_type, 
        task.product_id, 
        task.quantity, 
        task.location_id,
        task.priority
      ]);
      
      console.log(`  - 저장: 토트=${task.tote_id}, 상품ID=${task.product_id}, 위치=${task.location_id}, 수량=${task.quantity}, 우선순위=${task.priority}`);
    }
    
    console.log(`✅ 총 ${tasks.length}개 출고 피킹 태스크 저장 완료`);
    
  } finally {
    await closeConnection(client);
  }
}

/**
 * 출고용 피킹 태스크 생성 및 저장 메인 함수
 * @returns {Promise<Array>} 생성된 피킹 태스크 목록
 */
export async function processOutboundPickingTasks() {
  // 1. 현재 작업 중인 랙 확인
  const scheduledRacks = await getPickingRacks();
  const scheduledRackIds = scheduledRacks.map(rack => rack.location_id);
  
  console.log(`📋 스케줄된 랙 ID 목록: ${scheduledRackIds.join(', ')}`);
  
  // 2. 출고용 토트 아이템 가져오기
  const toteItems = await getOutboundToteItems();
  
  if (toteItems.length === 0) {
    console.log('📦 처리할 출고용 토트 아이템이 없습니다.');
    return [];
  }
  
  // 3. 피킹 태스크 생성 (동선 최적화)
  const tasks = createOutboundPickingTasks(scheduledRackIds, toteItems);
  
  // 4. DB에 저장
  await saveOutboundPickingTasks(tasks);
  
  return tasks;
}

// 직접 실행 시에만 호출
if (import.meta.main) {
  processOutboundPickingTasks();
}

// bun src/utils/outbound-process/pickingOBTask.js