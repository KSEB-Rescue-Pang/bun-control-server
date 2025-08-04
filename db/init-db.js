import { readFile } from 'fs/promises';
import { join } from 'path';
import { createConnection, closeConnection } from './index.js';

const schemaPath = join(import.meta.dir, 'schema.sql');
const seedPath = join(import.meta.dir, 'seed.sql');

async function initDB() {
  let client;
  
  try {
    client = await createConnection();

    const schema = await readFile(schemaPath, 'utf-8');
    const seed = await readFile(seedPath, 'utf-8');

    console.log('Creating schema...');
    await client.query(schema);

    console.log('Seeding data...');
    await client.query(seed);

    console.log('DB 초기화 완료');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (client) {
      await closeConnection(client);
    }
  }
}

initDB();