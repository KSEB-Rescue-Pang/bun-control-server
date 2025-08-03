import { Client } from 'pg';

export const dbConfig = {
  host: 'localhost',
  user: 'kunwoopark',
  password: '1234',
  database: 'rescupang',
};

export async function createConnection() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('PostgreSQL 연결 성공');
    return client;
  } catch (err) {
    console.error('PostgreSQL 연결 실패:', err.message);
    throw err;
  }
}

export async function closeConnection(client) {
  try {
    await client.end();
    console.log('DB 연결 종료');
  } catch (err) {
    console.error('DB 연결 종료 실패:', err.message);
  }
} 