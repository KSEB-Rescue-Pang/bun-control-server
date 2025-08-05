import { createConnection, closeConnection } from '../../../db/index.js';

// TODO: 나중에 inbound_list 를 많이 늘려서 10개씩 끊어가도록 수정해야 함

// 타입 정의
type InboundItem = {
  inbound_id: string;
  product_id: string;
  name: string;
  weight: number;
  location_id?: string;
  tote_id?: string;
}

type ToteBox = {
  tote_id: string;
  items: InboundItem[];
  totalWeight: number;
}

type DatabaseClient = {
  query: (query: string, params?: any[]) => Promise<{ rows: any[] }>;
}

// 대기 중인 인바운드 데이터 가져오기
export async function getWaitingInboundItems(): Promise<InboundItem[]> {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT 
        il.inbound_id,
        il.product_id,
        p.name,
        p.weight,
      FROM inbound_list il
      JOIN products p ON il.product_id = p.product_id
      WHERE il.status = '대기'
      ORDER BY il.arrival_time ASC
    `;
    
    const result = await client.query(query);
    
    console.log(`📦 대기 중인 인바운드 아이템: ${result.rows.length}개`);
    
    result.rows.forEach((item: InboundItem) => {
      console.log(`  - ID: ${item.inbound_id}, 상품: ${item.name}, 무게: ${item.weight}kg`);
    });
    
    return result.rows;
    
  } finally {
    await closeConnection(client);
  }
}

// picking_tasks에서 대기/진행 중인 tote_id 목록 가져오기
export async function getActiveToteIds(): Promise<string[]> {
  const client = await createConnection();
  
  try {
    const query = `
      SELECT DISTINCT tote_id 
      FROM picking_tasks
      WHERE status IN ('대기', '진행')
        AND tote_id IS NOT NULL
      ORDER BY tote_id
    `;
    
    const result = await client.query(query);
    
    console.log(`현재 작업 중인 토트: ${result.rows.length}개`);
    result.rows.forEach((row: { tote_id: string }) => {
      console.log(`  - Tote ID: ${row.tote_id}`);
    });
    
    return result.rows.map((row: { tote_id: string }) => row.tote_id);
    
  } finally {
    await closeConnection(client);
  }
}

// 사용 가능한 토트 10개 찾기 (100번부터 시작)
function getAvailableToteIds(activeToteIds: string[]): string[] {
  const availableTotes: string[] = [];
  let toteNumber = 100;
  
  while (availableTotes.length < 10) {
    const toteId = `TOTE-${toteNumber}`;
    
    if (!activeToteIds.includes(toteId)) {
      availableTotes.push(toteId);
    }
    
    toteNumber++;
  }
  
  console.log(`사용 가능한 토트 풀 생성: ${availableTotes.join(', ')}`);
  return availableTotes;
}

// 토트박스에 18kg 이하로 아이템을 담고 토트박스 번호를 부여하는 함수
export function assignToteBoxes(items: InboundItem[], availableTotes: string[]): ToteBox[] {
  // 다음 사용할 토트 번호 찾기
  let nextToteNumber = 100;
  while (availableTotes.includes(`TOTE-${nextToteNumber}`)) {
    nextToteNumber++;
  }

  const totes: ToteBox[] = [];
  let currentTote: ToteBox = {
    tote_id: `TOTE-${nextToteNumber}`,
    items: [],
    totalWeight: 0,
  };

  // 아이템들을 18kg 이하로 토트에 할당
  for (const item of items) {
    const itemWeight = parseFloat(item.weight.toString()) || 0;
    
    if (currentTote.totalWeight + itemWeight > 18) {
      totes.push(currentTote);
      nextToteNumber++;
      currentTote = {
        tote_id: `TOTE-${nextToteNumber}`,
        items: [],
        totalWeight: 0
      };
    }
    
    currentTote.items.push(item);
    currentTote.totalWeight += itemWeight;
  }

  // 마지막 토트 추가
  if (currentTote.items.length > 0) {
    totes.push(currentTote);
  }

  return totes;
}

// tote_items 테이블에 토트 아이템들을 저장하는 함수
async function saveToteItemsToDB(client: DatabaseClient, totes: ToteBox[]): Promise<void> {
  for (const tote of totes) {
    console.log(`토트 ${tote.tote_id}에 ${tote.items.length}개 아이템 저장 중...`);
    
    for (const item of tote.items) {
      const insertQuery = `
        INSERT INTO tote_items (tote_id, product_id, inbound_id)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(insertQuery, [
        tote.tote_id,
        item.product_id,
        item.inbound_id
      ]);
      
      console.log(`  - 저장: 토트=${tote.tote_id}, 상품ID=${item.product_id}, 인바운드ID=${item.inbound_id}`);
    }
  }
}

// TODO: assignToteBoxes 에서 만들어진대로 tote_items 테이블에 추가하는 함수

// 실행 예시
if (import.meta.main) {
  console.log('토트박스 할당 프로세스 시작...\n');
  
  // 대기 중인 아이템과 사용 중인 토트 ID 조회
  const items = await getWaitingInboundItems();
  const activeToteIds = await getActiveToteIds();
  
  // 토트박스 할당
  const totes = assignToteBoxes(items, activeToteIds);
  
  if (totes.length === 0) {
    console.log('처리할 아이템이 없습니다.');
  } else {
    console.log(`\n ${totes.length}개의 토트박스가 생성되었습니다.`);
    
    // 토트박스별 상세 정보 출력
    totes.forEach((tote: ToteBox) => {
      console.log(`\n[${tote.tote_id}]`);
      console.log(`총 무게: ${tote.totalWeight}kg`);
      console.log(`아이템 수: ${tote.items.length}개`);
      tote.items.forEach((item: InboundItem) => {
        console.log(`- 상품 ID: ${item.product_id}, 무게: ${item.weight}kg`);
      });
    });
  }
} 