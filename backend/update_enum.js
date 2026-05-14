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
  console.log('Adding "decor" to enum...');
  try {
    await client.query("ALTER TYPE venue_sections_sectiontype_enum ADD VALUE IF NOT EXISTS 'decor'");
    console.log('Successfully added "decor"');
  } catch (e) {
    console.log('Note: "decor" might already exist or error occurred:', e.message);
  }
  await client.end();
}

main().catch(console.error);
