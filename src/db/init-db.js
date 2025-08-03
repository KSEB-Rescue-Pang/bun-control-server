import { Client } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

const schemaPath = join(import.meta.dir, 'schema.sql');
const seedPath = join(import.meta.dir, 'seed.sql');

const client = new Client({
  host: 'postgres',         // 도커 컨테이너 이름이 'postgres'일 경우
  port: 5432,
  user: 'your_user',
  password: 'your_password',
  database: 'your_database',
});

async function init() {
  try {
    await client.connect();

    const schema = await readFile(schemaPath, 'utf-8');
    const seed = await readFile(seedPath, 'utf-8');

    console.log('📦 Creating schema...');
    await client.query(schema);

    console.log('🌱 Seeding data...');
    await client.query(seed);

    console.log('✅ DB 초기화 완료');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

initDB();