const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345a',
    database: 'ticketsystemdb',
  });

  await client.connect();
  const res = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'venue_sections_sectiontype_enum'");
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
