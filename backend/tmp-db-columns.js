import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();
    const studentCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Student' ORDER BY ordinal_position");
    console.log('STUDENT COLUMNS:');
    console.log(JSON.stringify(studentCols.rows, null, 2));
    const photoCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='StudentPhoto' ORDER BY ordinal_position");
    console.log('STUDENTPHOTO COLUMNS:');
    console.log(JSON.stringify(photoCols.rows, null, 2));
  } catch (error) {
    console.error('DB ERROR', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
