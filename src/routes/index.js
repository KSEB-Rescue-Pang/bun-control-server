import { loginWorker, startWork, finishWork } from './workers.js';
import { scanTote } from './totes.js';

export const router = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts.length === 3) {
    // 작업자 등록: PUT /{work_type}/{worker_id}/login
    if (req.method === 'PUT' && pathParts[2] === 'login') {
      return loginWorker(req);
    }
    
    // 토트 스캔: POST /{work_type}/{worker_id}/scan
    if (req.method === 'POST' && pathParts[2] === 'scan') {
      return scanTote(req);
    }
    
    // 작업 시작: POST /{work_type}/{worker_id}/start
    if (req.method === 'POST' && pathParts[2] === 'start') {
      return startWork(req);
    }
    
    // 작업 완료: POST /{work_type}/{worker_id}/finish
    if (req.method === 'POST' && pathParts[2] === 'finish') {
      return finishWork(req);
    }
  }
  
  return new Response('Not Found', { status: 404 });
}; 