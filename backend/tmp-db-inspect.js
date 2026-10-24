import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const tablesToInspect = ["users", "School", "Student"];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function inspectEndpoint(label, connectionString) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    const tableResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tables = tableResult.rows.map((row) => row.table_name);
    console.log(`${label}: connected`);
    console.log(`Tables: ${tables.join(", ") || "(none)"}`);

    for (const table of tablesToInspect) {
      if (!tables.includes(table)) {
        continue;
      }

      const columnResult = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );

      const countResult = await client.query(
        `SELECT count(*) AS row_count
         FROM ${quoteIdentifier("public")}.${quoteIdentifier(table)}`
      );

      console.log(
        `${label}: ${table} | columns: ${columnResult.rows
          .map((row) => row.column_name)
          .join(", ")} | rows: ${countResult.rows[0].row_count}`
      );
    }
  } catch (error) {
    console.log(`${label}: ERROR ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  await inspectEndpoint("DATABASE_URL", process.env.DATABASE_URL);
  await inspectEndpoint("DIRECT_URL", process.env.DIRECT_URL);
}

main();
