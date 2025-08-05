import { createConnection, closeConnection } from '../../../db/index.js';
import fs from 'fs';
import path from 'path';  

// TODO: 나중에 inbound_list 를 많이 늘려서 10개씩 끊어가도록 수정해야 함

// 타입 정의
type InboundItem = {
  inbound_id: string;
  product_id: string;
  name: string;
  weight: number;
  img: string;
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

type shelf = {
  location_id: string;
  ib_distance: number;
  ob_distance: number;
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
        p.img
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
export function getAvailableToteIds(activeToteIds: string[]): string[] {
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
  // 사용 가능한 토트 풀에서 순서대로 사용
  let toteIndex = 0;

  const totes: ToteBox[] = [];
  let currentTote: ToteBox = {
    tote_id: availableTotes[toteIndex]!,
    items: [],
    totalWeight: 0,
  };

  // 아이템들을 18kg 이하로 토트에 할당
  for (const item of items) {
    const itemWeight = parseFloat(item.weight.toString()) || 0;
    
    if (currentTote.totalWeight + itemWeight > 18) {
      totes.push(currentTote);
      toteIndex++;
      
      // 토트 풀이 부족하면 에러
      // TODO: 이 부분은 따로 나중에 구현
      if (toteIndex >= availableTotes.length) {
        throw new Error(`토트 풀이 부족합니다. 현재 ${availableTotes.length}개 준비됨, ${toteIndex + 1}개 필요`);
      }
      
      currentTote = {
        tote_id: availableTotes[toteIndex]!,
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



  
  // tote_items에서 location_id가 없는 아이템들에 랜덤 위치 할당
  export async function assignRandomLocations() {
    const client = await createConnection();
    
    try {
      // location_id가 없는 tote_items 조회
      const selectQuery = `
        SELECT ti.tote_id, ti.inbound_id, ti.product_id 
        FROM tote_items ti
        WHERE ti.location_id IS NULL
      `;
      
      const result = await client.query(selectQuery);
      console.log(`위치 할당이 필요한 아이템: ${result.rows.length}개`);
  
      // config.json에서 A존 위치 목록 로드
      const locations = loadLocationsFromConfig();
  
      // 각 아이템에 랜덤 위치 할당
      for (const item of result.rows) {
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        
        const updateQuery = `
          UPDATE tote_items 
          SET location_id = $1
          WHERE inbound_id = $2
        `;
        
        await client.query(updateQuery, [randomLocation, item.inbound_id]);
        console.log(`인바운드 ID ${item.inbound_id}에 위치 ${randomLocation} 할당`);
      }
  
      console.log('위치 할당 완료');
      
    } finally {
      await closeConnection(client);
    }
  }
  


  // config.json에서 위치 정보 로드하는 함수
function loadLocationsFromConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // A존 위치만 필터링해서 location_id 추출
      const aZoneLocations = configData.shelves
        .filter((shelf: { location_id: string }) => shelf.location_id.startsWith('A01'))
        .map((shelf: { location_id: string }) => shelf.location_id);
      
      // 일단 A 존에 대해서만 할당하게끔 했음
      console.log(`A존 위치 ${aZoneLocations.length}개 로드됨`);
      return aZoneLocations;
    } catch (error) {
      console.error('config.json 로드 실패:', error.message);
      // 대체 위치 목록 (fallback)
      return [
        'A01-R01-T', 'A01-R01-B', 'A01-R02-T', 'A01-R02-B',
        'A01-R03-T', 'A01-R03-B', 'A01-R04-T', 'A01-R04-B'
      ];
    }
  }

// 실행 예시
if (import.meta.main) {
  console.log('토트박스 할당 프로세스 시작...\n');
  
  // 대기 중인 아이템과 사용 가능한 토트 조회
  const items = await getWaitingInboundItems();
  const availableTotes = getAvailableToteIds(await getActiveToteIds());
  
  // 토트박스 할당
  const totes = assignToteBoxes(items, availableTotes);
  
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