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
  const res = await client.query(`SELECT * FROM events WHERE title = 'c' OR "pendingTitle" = 'c';`);
  console.log('--- EVENT C ROWS ---');
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
