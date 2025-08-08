import { createConnection, closeConnection } from '../../db/index.js';
import { publishAssignToShelf } from '../../mqtt/mqtt.js';

export const scanTote = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/scan
  if (pathParts.length !== 3 || pathParts[2] !== 'scan') {
    return new Response('Invalid URL format', { status: 400 });
  }
  
  const work_type = pathParts[0]; // 'IB' 또는 'OB'
  const worker_id = pathParts[1];
  
  try {
    const body = await req.json();
    const { tote_id } = body;
    
    if (!tote_id) {
      return new Response('tote_id is required', { status: 400 });
    }
    
    const client = await createConnection();
    
    try {
      // 1. 해당 토트의 대기 중인 피킹 태스크들을 진행으로 변경
      const updateQuery = `
        UPDATE picking_tasks 
        SET status = '진행', assigned_worker_id = $1
        WHERE tote_id = $2 
          AND work_type = $3 
          AND status = '대기'
      `;
      
      const updateResult = await client.query(updateQuery, [worker_id, tote_id, work_type]);
      
      if (updateResult.rowCount === 0) {
        return new Response('No available tasks for this tote', { status: 404 });
      }
      
      // 2. 해당 토트의 피킹 태스크 목록 조회
      const selectQuery = `
        SELECT 
          pt.task_id,
          pt.product_id,
          pt.quantity,
          pt.location_id,
          pt.priority,
          p.name as product_name,
          p.weight as product_weight
        FROM picking_tasks pt
        JOIN products p ON pt.product_id = p.product_id
        WHERE pt.tote_id = $1 
          AND pt.work_type = $2 
          AND pt.status = '진행'
        ORDER BY pt.priority ASC
      `;
      
      const result = await client.query(selectQuery, [tote_id, work_type]);

      const tasks = result.rows.map(row => ({
        task_id: row.task_id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        location_id: row.location_id,
        priority: row.priority
      }));

      // MQTT Publish: server/{shelf_id}/assign
      // shelf_id는 location_id에서 위치 부분만 사용: A01-R01-T -> A01-R01
      const firstTask = tasks[0];
      if (firstTask && firstTask.location_id) {
        const [zoneRaw, rackRaw, posRaw] = firstTask.location_id.split('-');
        // A01-R01-T -> shelf_id: A01-R01, position: t|b
        const shelf_id = `${zoneRaw}-${rackRaw}`;
        const position = posRaw?.toLowerCase() === 't' ? 't' : 'b';

        // products payload 구성: 동일 location의 모든 태스크를 묶어서 전송
        const products = tasks
          .filter(t => t.location_id === firstTask.location_id)
          .map(t => ({
            product_id: String(t.product_id),
            weight: t.product_weight != null ? String(t.product_weight) : null,
            quantity: t.quantity,
          }));

        const payload = {
          worker_id,
          position,
          work_type,
          products,
        };

        try {
          await publishAssignToShelf(shelf_id, payload, { qos: 1, retain: false });
        } catch (e) {
          console.error('MQTT publish 실패:', e);
        }
      }

      return new Response(JSON.stringify({ 
        tote_id,
        worker_id,
        work_type,
        tasks,
        message: `${updateResult.rowCount} tasks started`
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      await closeConnection(client);
    }
    
  } catch (error) {
    console.error('Tote scan error:', error);
    if (error instanceof SyntaxError) {
      return new Response('Invalid JSON in request body', { status: 400 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
};