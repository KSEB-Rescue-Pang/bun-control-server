import { Pool } from 'pg'

export const db = new Pool({
  host: 'localhost',        // 또는 실제 DB IP
  port: 5432,
  user: 'kunwoopark',        // ← pgAdmin에서 사용 중인 유저명
  password: '1234',
  database: 'rescupang' // ← 연결할 DB 이름
})

await db.connect()
console.log('PostgreSQL 연결 완료')