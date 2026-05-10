const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345a',
  database: 'ticketsystemdb',
});

async function main() {
  await client.connect();
  const res = await client.query(`SELECT id, title, status, "pendingTitle", "pendingImageUrl" FROM events WHERE id = 'b304a4b8-9e79-4db2-bc6e-532179fcc7e2';`);
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
