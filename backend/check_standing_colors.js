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
  
  // Find events that have standing sections
  const res = await client.query(`
    SELECT e.title, vs.id, vs.name, vs."sectionType", vs.color, vs.price, vs."mapX"
    FROM venue_sections vs
    JOIN events e ON e.id = vs."eventId"
    WHERE vs."sectionType" = 'standing'
    LIMIT 20
  `);
  
  console.log('Standing sections:');
  console.log(JSON.stringify(res.rows, null, 2));
  
  await client.end();
}

main().catch(console.error);
