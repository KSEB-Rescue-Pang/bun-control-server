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

export const startWork = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/start
  if (pathParts.length !== 3 || pathParts[2] !== 'start') {
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
    // TODO: DB에서 작업 상태를 '진행 중'으로 변경
    console.log(`Worker ${worker_id} of type ${work_type} started work.`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Start work error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const finishWork = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/finish
  if (pathParts.length !== 3 || pathParts[2] !== 'finish') {
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
    // TODO: DB에서 작업 상태를 '완료'로 변경
    console.log(`Worker ${worker_id} of type ${work_type} finished work.`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Finish work error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const returnTote = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/return
  if (pathParts.length !== 3 || pathParts[2] !== 'return') {
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
    // TODO: DB에서 토트박스 반납 처리 (토트 상태 변경, 작업자 할당 해제 등)
    console.log(`Worker ${worker_id} of type ${work_type} returned tote.`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Return tote error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}; 