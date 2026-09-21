import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();
    const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    console.log('TABLES:', tables.rows.map(r => `${r.table_schema}.${r.table_name}`).join(', '));
    const studentTable = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND lower(table_name) LIKE '%student%' ORDER BY table_name;");
    console.log('STUDENT-LIKE TABLES:', studentTable.rows.map(r => r.table_name).join(', '));
    const photoTable = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND lower(table_name) LIKE '%photo%' ORDER BY table_name;");
    console.log('PHOTO-LIKE TABLES:', photoTable.rows.map(r => r.table_name).join(', '));
  } catch (error) {
    console.error('DB ERROR', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
