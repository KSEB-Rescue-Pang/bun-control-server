import { 
  getOutboundList,
  assignOutboundToteBoxes,
  saveOutboundToteItems,
  processOutboundToteAssignment
} from '../utils/outbound/assignTote.js';
import { 
  getPickingRacks,
  getOutboundToteItems,
  createOutboundPickingTasks,
  saveOutboundPickingTasks,
  processOutboundPickingTasks
} from '../utils/outbound/pickingTask.js';

/**
 * 출고 토트박스 할당 메인 서비스
 * 1. 대기 중인 출고 아이템 조회
 * 2. 18kg 제한으로 토트박스에 할당
 * 3. 재고 위치 확인 및 할당
 */
export async function runOutboundToteAssignmentService() {
  const result = await processOutboundToteAssignment();
  
  if (result.length > 0) {
    console.log(`✅ 성공적으로 ${result.length}개의 출고 토트박스가 할당되었습니다`);
  } else {
    console.log('📦 처리할 대기 중인 출고 아이템이 없습니다.');
  }
  
  return result;
}

/**
 * 출고 피킹 태스크 생성 메인 서비스
 * 1. 현재 작업 중인 랙 확인
 * 2. 출고용 토트 아이템 가져오기
 * 3. 동선 최적화로 피킹 순서 결정
 * 4. 피킹 태스크 생성 및 저장
 */
export async function runOutboundPickingTaskService() {
  const result = await processOutboundPickingTasks();
  
  if (result.length > 0) {
    console.log(`✅ 성공적으로 ${result.length}개의 출고 피킹 태스크가 생성되었습니다`);
  } else {
    console.log('📦 처리할 출고용 토트 아이템이 없습니다.');
  }
  
  return result;
}

/**
 * 출고 전체 프로세스 실행 (토트 할당 + 피킹 태스크 생성)
 */
export async function runOutboundFullProcess() {
  console.log('🚀 출고 전체 프로세스 시작\n');
  
  // 1. 토트 할당
  console.log('📦 1단계: 출고 토트 할당');
  const totes = await runOutboundToteAssignmentService();
  
  if (totes.length === 0) {
    console.log('📦 토트 할당이 없어서 프로세스를 종료합니다.');
    return { totes: [], tasks: [] };
  }
  
  console.log('\n📋 2단계: 출고 피킹 태스크 생성');
  const tasks = await runOutboundPickingTaskService();
  
  console.log('\n✅ 출고 전체 프로세스 완료!');
  return { totes, tasks };
}

// 직접 실행 시
if (import.meta.main) {
  console.log('출고 서비스 직접 실행\n');
  
  const result = await runOutboundFullProcess();
  
  if (result.totes.length > 0) {
    console.log(`\n📊 결과 요약:`);
    console.log(`  - 할당된 토트: ${result.totes.length}개`);
    console.log(`  - 생성된 피킹 태스크: ${result.tasks.length}개`);
  }
}

// bun src/services/outbound.js
