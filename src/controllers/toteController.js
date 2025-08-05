export const scanTote = async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // URL 형식 검증: /{work_type}/{worker_id}/scan
  if (pathParts.length !== 3 || pathParts[2] !== 'scan') {
    return new Response('Invalid URL format', { status: 400 });
  }
  
  try {
    const body = await req.json();
    const { tote_id } = body;
    
    if (!tote_id) {
      return new Response('tote_id is required', { status: 400 });
    }
    
    // TODO: DB에서 토트 상태 확인 및 상품 목록 조회
    
    // 임시 성공 응답
    const mockProducts = [
      { product_id: "p101", name: "다우닝 세제", quantity: 3, target_location_id: "Z03-R12-B1" },
      { product_id: "p202", name: "고무장갑", quantity: 5, target_location_id: "Z03-R12-B1" },
      { product_id: "p202", name: "고무장갑", quantity: 5, target_location_id: "Z03-R12-1" },
    ];
    
    return new Response(JSON.stringify({ tasks: mockProducts }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Tote scan error:', error);
    if (error instanceof SyntaxError) {
      return new Response('Invalid JSON in request body', { status: 400 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
};