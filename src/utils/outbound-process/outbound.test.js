import { getPendingOutbounds, makeOBTask, checkProductStock, getScheduledRacks, isLocationScheduled } from './outbound.js';
import { createConnection } from '../../../db/index.js';

// 초기화 함수: outbound_list 상태를 '대기'로 되돌리기
async function resetOutboundStatus() {
  const client = await createConnection();
  
  try {
    console.log('=== outbound_list 상태 초기화 시작 ===');
    
    const resetQuery = `
      UPDATE outbound_list 
      SET status = '대기' 
      WHERE status = '매핑완료'
    `;
    
    const result = await client.query(resetQuery);
    console.log(`초기화된 레코드 수: ${result.rowCount}개`);
    
    console.log('=== outbound_list 상태 초기화 완료 ===');
  } catch (error) {
    console.error('초기화 실패:', error);
  } finally {
    await client.end();
  }
}

// 재고 확인 테스트
async function testCheckProductStock() {
  try {
    console.log('\n=== checkProductStock 함수 테스트 시작 ===');
    
    // 상품 1번 재고 확인
    const stock1 = await checkProductStock(1);
    console.log('상품 1번 재고:', stock1);
    
    // 상품 2번 재고 확인
    const stock2 = await checkProductStock(2);
    console.log('상품 2번 재고:', stock2);
    
    // 상품 999번 재고 확인 (없는 상품)
    const stock999 = await checkProductStock(999);
    console.log('상품 999번 재고:', stock999);
    
    console.log('=== 재고 확인 테스트 완료 ===');
  } catch (error) {
    console.error('재고 확인 테스트 실패:', error);
  }
}

// 스케줄된 랙 확인 테스트
async function testGetScheduledRacks() {
  try {
    console.log('\n=== getScheduledRacks 함수 테스트 시작 ===');
    
    const scheduledRacks = await getScheduledRacks();
    console.log('현재 스케줄된 랙:', scheduledRacks);
    console.log('스케줄된 랙 수:', scheduledRacks.length);
    
    console.log('=== 스케줄된 랙 확인 테스트 완료 ===');
  } catch (error) {
    console.error('스케줄된 랙 확인 테스트 실패:', error);
  }
}

// 위치 스케줄 확인 테스트
async function testIsLocationScheduled() {
  try {
    console.log('\n=== isLocationScheduled 함수 테스트 시작 ===');
    
    // A01-R01-T 위치 확인
    const isScheduled1 = await isLocationScheduled('A01-R01-T');
    console.log('A01-R01-T 스케줄 여부:', isScheduled1);
    
    // A01-R02-T 위치 확인
    const isScheduled2 = await isLocationScheduled('A01-R02-T');
    console.log('A01-R02-T 스케줄 여부:', isScheduled2);
    
    // 존재하지 않는 위치 확인
    const isScheduled3 = await isLocationScheduled('Z99-R99-T');
    console.log('Z99-R99-T 스케줄 여부:', isScheduled3);
    
    console.log('=== 위치 스케줄 확인 테스트 완료 ===');
  } catch (error) {
    console.error('위치 스케줄 확인 테스트 실패:', error);
  }
}

// 기존 테스트
async function testGetPendingOutbounds() {
  try {
    console.log('=== getPendingOutbounds 함수 테스트 시작 ===');
    
    const result = await getPendingOutbounds();
    
    console.log('조회 결과:', result);
    console.log('조회된 레코드 수:', result.length);
    
    if (result.length > 0) {
      console.log('첫 번째 레코드 예시:', result[0]);
    }
    
    console.log('=== 테스트 완료 ===');
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

// 새로운 매핑 테스트
async function testMakeOBTask() {
  try {
    console.log('\n=== makeOBTask 함수 테스트 시작 ===');
    
    // 매핑 전 상태 확인
    console.log('매핑 전 대기 중인 출고 요청:');
    const beforeMapping = await getPendingOutbounds();
    console.log(`- 대기 중인 요청 수: ${beforeMapping.length}`);
    
    // 매핑 실행
    console.log('\n매핑 실행 중...');
    const mappedCount = await makeOBTask();
    console.log(`- 매핑된 작업 수: ${mappedCount}`);
    
    // 매핑 후 상태 확인
    console.log('\n매핑 후 대기 중인 출고 요청:');
    const afterMapping = await getPendingOutbounds();
    console.log(`- 대기 중인 요청 수: ${afterMapping.length}`);
    
    console.log('=== 매핑 테스트 완료 ===');
  } catch (error) {
    console.error('매핑 테스트 실패:', error);
  }
}

// 테스트 실행
async function runAllTests() {
  // 1. 초기화
  await resetOutboundStatus();
  
  // 2. 새로운 함수들 테스트
  await testCheckProductStock();
  await testGetScheduledRacks();
  await testIsLocationScheduled();
  
  // 3. 기존 테스트
  await testGetPendingOutbounds();
  await testMakeOBTask();
}

runAllTests(); 