import type { ToteBox, InboundItem, DatabaseClient } from '../../types/common.js';
import { createConnection, closeConnection } from '../../../db/index.js';

// 지금 스케줄 있는 랙 가져오기 → 피킹태스크 만들어(순서 정해짐)


async function getScheduledRack(client: DatabaseClient): Promise<string[]> {
  const result = await client.query('SELECT location_id FROM vw_scheduled_rack where work_type = "IB"');
  return result.rows.map((row: { location_id: string }) => row.location_id);
}

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