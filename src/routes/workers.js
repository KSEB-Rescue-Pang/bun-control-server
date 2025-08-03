export const loginWorker = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/login
  if (pathParts.length !== 3 || pathParts[2] !== 'login') {
    return new Response('Invalid URL format', { status: 400 });
  }

  const work_type = pathParts[0];
  const worker_id = pathParts[1];

  // 파라미터 검증
  if (!['IB', 'OB'].includes(work_type)) {
    return new Response('Invalid work_type. Must be IB or OB', { status: 400 });
  }
  if (!worker_id || worker_id.length < 4) {
    return new Response('Invalid worker_id', { status: 400 });
  }

  try {
    // TODO: DB에 작업자 활성화 로직 추가
    console.log(`Worker ${worker_id} of type ${work_type} logged in.`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Worker login error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}; 