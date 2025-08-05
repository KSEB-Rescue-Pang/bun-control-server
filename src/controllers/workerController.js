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

export const reportError = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/product/error
  if (pathParts.length !== 4 || pathParts[2] !== 'product' || pathParts[3] !== 'error') {
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
    // Request Body 파싱
    const body = await req.json();
    const { error } = body;

    if (!error || !Array.isArray(error) || error.length === 0) {
      return new Response('error array is required', { status: 400 });
    }

    // 에러 코드 검증
    const validErrorCodes = ['TOTE_NOT_EMPTY', 'QUANTITY_UNDER', 'QUANTITY_OVER'];
    
    for (const errorItem of error) {
      if (!errorItem.error_code || !validErrorCodes.includes(errorItem.error_code)) {
        return new Response('Invalid error_code', { status: 400 });
      }
      
      // QUANTITY_UNDER, QUANTITY_OVER의 경우 product_id와 quantity_diff 필수
      if (['QUANTITY_UNDER', 'QUANTITY_OVER'].includes(errorItem.error_code)) {
        if (!errorItem.product_id || typeof errorItem.quantity_diff !== 'number') {
          return new Response('product_id and quantity_diff are required for quantity errors', { status: 400 });
        }
      }
    }

    // TODO: DB에 오류 정보 저장
    console.log(`Worker ${worker_id} of type ${work_type} reported error:`, error);
    
    return new Response(null, { status: 200 });

  } catch (error) {
    console.error('Report error API error:', error);
    if (error instanceof SyntaxError) {
      return new Response('Invalid JSON in request body', { status: 400 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
};