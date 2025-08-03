import { loginWorker } from './workers.js';
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
  }
  
  return new Response('Not Found', { status: 404 });
}; 