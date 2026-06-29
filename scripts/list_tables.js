import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgres://postgres:Sb%401230588@localhost:5432/shin";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables in database:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error executing query", err);
  } finally {
    await client.end();
  }
}

main();
