import { 
  getWaitingInboundItems, 
  getActiveToteIds, 
  getAvailableToteIds, 
  assignToteBoxes,
  assignRandomLocations,
  saveToteItemsToDB,  
} from '../utils/inbound/assignTote.js';
import { getScheduledRack, createPickingTasks, savePickingTask, type PickingTask } from '../utils/inbound/pickingTask.js';
import type { ToteBox } from '../types/common.js';
import { createConnection, closeConnection } from '../../db/index.js';

/**
 * 토트박스 할당 메인 서비스
 * 1. 대기 중인 인바운드 아이템 조회
 * 2. 사용 가능한 토트 풀 생성
 * 3. 아이템을 토트박스에 할당 (18kg 제한)
 * 4. 랜덤 위치 할당
 */

export async function runToteAssignmentService(): Promise<ToteBox[]> {
  const items = await getWaitingInboundItems();
  
  if (items.length === 0) {
    return [];
  }

  const activeToteIds = await getActiveToteIds();
  const availableTotes = getAvailableToteIds(activeToteIds);
  const totes = assignToteBoxes(items, availableTotes);
  const totesWithLocations = assignRandomLocations('A', totes);
  
  // DB에 토트 아이템 저장
  const client = await createConnection();
  try {
    await saveToteItemsToDB(client, totesWithLocations);
  } finally {
    await closeConnection(client);
  }

  return totesWithLocations;
}

export async function runPickingTaskService(
  toteProvider: () => Promise<ToteBox[]>
): Promise<PickingTask[]> {
  const totes = await toteProvider();
  const client = await createConnection();
  try {
    const scheduledRack = await getScheduledRack(client);
    const tasks = createPickingTasks(scheduledRack, totes);
    
    // DB에 피킹 태스크 저장
    await savePickingTask(client, tasks);
    
    return tasks;
  } finally {
    await closeConnection(client);
  }
}

// 직접 실행 시
if (import.meta.main) {
  console.log('토트박스 할당 서비스 직접 실행\n');
  
  const result = await runToteAssignmentService();
  
  if (result.length > 0) {
    console.log(`성공적으로 ${result.length}개의 토트박스가 할당되었습니다`);
    
    // 피킹 태스크도 생성
    const tasks = await runPickingTaskService(runToteAssignmentService);
    console.log(`${tasks.length}개의 피킹 태스크가 생성되었습니다`);
  } else {
    console.log('처리할 아이템이 없어서 종료되었습니다.');
  }
} 

// bun src/services/inbound.ts