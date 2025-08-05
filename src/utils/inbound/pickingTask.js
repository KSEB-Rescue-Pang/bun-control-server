import { createConnection, closeConnection } from '../../../db/index.js';
import fs from 'fs';
import path from 'path';

// config.json에서 위치 정보 로드하는 함수
function loadLocationsFromConfig() {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // A존 위치만 필터링해서 location_id 추출
    const aZoneLocations = configData.shelves
      .filter(shelf => shelf.location_id.startsWith('A01'))
      .map(shelf => shelf.location_id);
    
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
      console.log(`  ✓ 인바운드 ID ${item.inbound_id}에 위치 ${randomLocation} 할당`);
    }

    console.log('위치 할당 완료');
    
  } finally {
    await closeConnection(client);
  }
}



// TODO: 지금 스케줄 있는 랙 가져오기 - status 진행 



// TODO: 피킹태스크 만들기(순서 정해짐)
/*
- 지금 스케줄 있는 랙에 넣어야 하면 priority 를 가장 낮게 설정 
- 가능하면 물리적으로 가깝게 조율

*/