export const loginWorker = ({ body }) => {
  const { worker_id, type } = body
  // DB 저장 + 응답 반환
  return {
    message: 'Worker registered successfully',
    assigned_type: type,
    timestamp: new Date().toISOString()
  }
}

export const scanTote = ({ body }) => {
  const { tote_id, location } = body
  // DB 저장 + 응답 반환
  return {
    message: 'Tote scanned successfully',
    tote_id,
    location,
    timestamp: new Date().toISOString()
  }
}

export const startTask = ({ body }) => {
  const { task_id, worker_id } = body
  // DB 저장 + 응답 반환
  return {
    message: 'Task started successfully',
    task_id,
    worker_id,
    status: 'in_progress',
    timestamp: new Date().toISOString()
  }
}

export const completeTask = ({ params, body }) => {
  const { task_id } = params
  const { result } = body
  // DB 저장 + 응답 반환
  return {
    message: 'Task completed successfully',
    task_id,
    result,
    status: 'completed',
    timestamp: new Date().toISOString()
  }
}

export const returnTote = ({ params }) => {
  const { tote_id } = params
  // DB 저장 + 응답 반환
  return {
    message: 'Tote returned successfully',
    tote_id,
    status: 'returned',
    timestamp: new Date().toISOString()
  }
}