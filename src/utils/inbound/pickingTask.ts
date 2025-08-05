import type { ToteBox, InboundItem, DatabaseClient } from '../../types/common.js';

// 지금 스케줄 있는 랙 가져오기 → 피킹태스크 만들어(순서 정해짐)

// 피킹 태스크 타입 정의
export type PickingTask = {
  tote_id: string;
  work_type: 'IB';
  product_id: string;
  quantity: number;
  location_id: string;
  priority?: number; // 동선 최적화에 따른 우선순위
}

export async function getScheduledRack(client: DatabaseClient): Promise<string[]> {
  const result = await client.query(`SELECT location_id FROM vw_scheduled_rack where work_type = 'IB'`);
  return result.rows.map((row: { location_id: string }) => row.location_id);
}

export function createPickingTasks(scheduledRack: string[], totes: ToteBox[]): PickingTask[] {
  const allTasks: PickingTask[] = [];
  
  totes.forEach(tote => {
    // 토트 내 아이템들을 location-product_id로 그룹화
    const groupedItems = groupItemsByLocationAndProduct(tote.items);
    
    // 그룹화된 태스크들을 동선 최적화 순서로 정렬
    const sortedTasks = sortTasksByLocation(groupedItems, scheduledRack);
    
    // 각 태스크에 우선순위 부여
    sortedTasks.forEach((task, index) => {
      allTasks.push({
        ...task,
        tote_id: tote.tote_id,
        work_type: 'IB',
        priority: index + 1
      });
    });
  });
  
  return allTasks;
}


export async function savePickingTask(client: DatabaseClient, tasks: PickingTask[]) {
  const query = `
    INSERT INTO picking_tasks (tote_id, work_type, product_id, quantity, location_id)
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  for (const task of tasks) {
    await client.query(query, [
      task.tote_id, 
      task.work_type, 
      task.product_id, 
      task.quantity, 
      task.location_id
    ]);
  }
}


/**
 * 아이템들을 location-product_id로 그룹화하여 태스크 생성
 */
function groupItemsByLocationAndProduct(items: InboundItem[]): Omit<PickingTask, 'tote_id' | 'work_type' | 'priority'>[] {
  const taskMap = new Map<string, Omit<PickingTask, 'tote_id' | 'work_type' | 'priority'>>();
  
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
 * 태스크들을 location 가까움에 따라 정렬하되,
 * scheduledRack에 포함된 location은 맨 뒤로 미는 함수
 */
function sortTasksByLocation(
  tasks: Omit<PickingTask, 'tote_id' | 'work_type' | 'priority'>[],
  scheduledRack: string[]
): Omit<PickingTask, 'tote_id' | 'work_type' | 'priority'>[] {
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

// 기존 함수들은 유지
export function orderPickingTask(scheduledRack: string[], totes: ToteBox[]): ToteBox[] {
  return totes.map(tote => {
    // 토트 내 아이템들을 동선 최적화로 정렬
    const sortedItems = sortItemsByLocation(tote.items, scheduledRack);
    
    return {
      ...tote,
      items: sortedItems
    };
  });
}

/**
 * 아이템들을 location 가까움에 따라 정렬하되, 
 * scheduledRack에 포함된 location은 맨 뒤로 미는 함수
 */
function sortItemsByLocation(items: InboundItem[], scheduledRack: string[]): InboundItem[] {
  return items.sort((a, b) => {
    // location_id가 없는 경우 맨 뒤로 보냄
    if (!a.location_id) return 1;
    if (!b.location_id) return -1;
    if (!a.location_id && !b.location_id) return 0;


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
 * location_id에서 랙 번호 추출
 * 예: A01-R01-T -> 1, A01-R15-B -> 15
 */
function extractRackNumber(locationId: string): number {
  const match = locationId.match(/R(\d+)/);
  return match && match[1] ? parseInt(match[1], 10) : 999;
}

/**
 * location이 scheduledRack에 포함되어 있는지 확인
 */
function isLocationInScheduledRack(locationId: string, scheduledRack: string[]): boolean {
  return scheduledRack.includes(locationId);
}