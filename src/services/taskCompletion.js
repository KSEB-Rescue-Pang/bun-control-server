import { createConnection, closeConnection } from '../../db/index.js';
import { publishAssignToShelf } from '../../mqtt/mqtt.js';

/**
 * 하드웨어에서 전송된 작업 완료 신호 처리
 * @param {Object} data - {location_id, worker_id, code}
 */
export async function handleTaskCompletion(data) {
  const { location_id, worker_id, code } = data;
  
  if (!location_id || !worker_id || !code) {
    console.error('[TaskCompletion] 필수 파라미터 누락:', data);
    return;
  }
  
  // 에러 코드인 경우 로그만 남기고 수동 처리 대기
  if (code !== 'good') {
    console.log(`[TaskCompletion] 에러 신호 수신 - worker: ${worker_id}, location: ${location_id}, code: ${code}`);
    return;
  }
  
  try {
    // 자동 finish 처리 실행
    await executeFinishLogic(worker_id, location_id);
    console.log(`[TaskCompletion] 자동 완료 처리 성공 - worker: ${worker_id}, location: ${location_id}`);
  } catch (error) {
    console.error('[TaskCompletion] 자동 완료 처리 실패:', error);
  }
}

/**
 * Finish 로직 실행 (PDA finish API와 공통 로직)
 * @param {string} worker_id 
 * @param {string} current_location_id 
 */
export async function executeFinishLogic(worker_id, current_location_id = null) {
  const client = await createConnection();
  
  try {
    // 1. 현재 진행 중인 태스크 조회
    let currentTaskQuery = `
      SELECT task_id, tote_id, work_type, location_id, priority
      FROM picking_tasks 
      WHERE assigned_worker_id = $1 
        AND status = '진행'
    `;
    const params = [worker_id];
    
    // location_id가 제공된 경우 (하드웨어 신호) 해당 위치만 완료 처리
    if (current_location_id) {
      currentTaskQuery += ` AND location_id = $2`;
      params.push(current_location_id);
    }
    
    currentTaskQuery += ` ORDER BY priority ASC LIMIT 1`;
    
    const currentResult = await client.query(currentTaskQuery, params);
    
    if (currentResult.rows.length === 0) {
      console.log(`[FinishLogic] 진행 중인 태스크 없음 - worker: ${worker_id}`);
      return { completed: false, message: '진행 중인 태스크가 없습니다.' };
    }
    
    const currentTask = currentResult.rows[0];
    const { task_id, tote_id, work_type } = currentTask;
    
    // 2. 현재 태스크를 완료 처리
    const updateQuery = `
      UPDATE picking_tasks 
      SET status = '완료'
      WHERE task_id = $1
    `;
    await client.query(updateQuery, [task_id]);
    
    // 3. 동일 토트의 다음 태스크 조회
    const nextTaskQuery = `
      SELECT pt.task_id, pt.location_id, pt.priority, pt.product_id, pt.quantity, p.weight
      FROM picking_tasks pt
      JOIN products p ON pt.product_id = p.product_id
      WHERE pt.tote_id = $1 
        AND pt.work_type = $2 
        AND pt.assigned_worker_id = $3
        AND pt.status = '대기'
      ORDER BY pt.priority ASC
      LIMIT 1
    `;
    
    const nextResult = await client.query(nextTaskQuery, [tote_id, work_type, worker_id]);
    
    if (nextResult.rows.length > 0) {
      // 4. 다음 태스크가 있으면 진행 상태로 변경
      const nextTask = nextResult.rows[0];
      
      const updateNextQuery = `
        UPDATE picking_tasks 
        SET status = '진행'
        WHERE task_id = $1
      `;
      await client.query(updateNextQuery, [nextTask.task_id]);
      
      // 5. 다음 위치로 MQTT 신호 발행
      await publishNextTaskToMqtt(nextTask, worker_id, work_type);
      
      return {
        completed: false,
        message: '다음 태스크로 진행',
        next_location: nextTask.location_id,
        current_task_completed: task_id
      };
      
    } else {
      // 6. 다음 태스크가 없으면 모든 작업 완료
      console.log(`[FinishLogic] 모든 태스크 완료 - tote: ${tote_id}, worker: ${worker_id}`);
      
      return {
        completed: true,
        message: '모든 태스크 완료',
        tote_id,
        current_task_completed: task_id
      };
    }
    
  } finally {
    await closeConnection(client);
  }
}

/**
 * 다음 태스크 MQTT 발행
 */
async function publishNextTaskToMqtt(nextTask, worker_id, work_type) {
  try {
    const [zoneRaw, rackRaw, posRaw] = nextTask.location_id.split('-');
    const shelf_id = `${zoneRaw}-${rackRaw}`;
    const position = posRaw?.toLowerCase() === 't' ? 't' : 'b';

    const payload = {
      worker_id,
      position,
      work_type,
      products: [{
        product_id: String(nextTask.product_id),
        weight: nextTask.weight != null ? String(nextTask.weight) : null,
        quantity: nextTask.quantity,
      }]
    };

    await publishAssignToShelf(shelf_id, payload, { qos: 1, retain: false });
  } catch (error) {
    console.error('[FinishLogic] MQTT 발행 실패:', error);
  }
}