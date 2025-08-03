import { loginWorker } from './workers.js';

export const router = (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // 작업자 등록 API: PUT /{work_type}/{worker_id}/login
  if (req.method === 'PUT' && pathParts.length === 3 && pathParts[2] === 'login') {
    return loginWorker(req);
  }
  
  return new Response('Not Found', { status: 404 });
}; 