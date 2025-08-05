import { loginWorker, startWork, finishWork, returnTote, reportError } from '../controllers/workerController.js';
import { scanTote } from '../controllers/toteController.js';

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
    
    // 작업 완료: POST /{work_type}/{worker_id}/finish
    if (req.method === 'POST' && pathParts[2] === 'finish') {
      return finishWork(req);
    }
    
    // 토트박스 반납: POST /{work_type}/{worker_id}/return
    if (req.method === 'POST' && pathParts[2] === 'return') {
      return returnTote(req);
    }
  }
  
  // 오류 보고: POST /{work_type}/{worker_id}/product/error
  if (pathParts.length === 4 && req.method === 'POST' && pathParts[2] === 'product' && pathParts[3] === 'error') {
    return reportError(req);
  }
  
  return new Response('Not Found', { status: 404 });
}; 