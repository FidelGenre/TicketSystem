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
  
  // Check sections for the event that's showing wrong colors
  const res = await client.query(`
    SELECT id, name, "sectionType", color, price, "mapX", "mapY"
    FROM venue_sections
    WHERE "eventId" = (SELECT id FROM events WHERE title LIKE '%Noche%' LIMIT 1)
    LIMIT 10
  `);
  
  console.log('Sections:');
  console.log(JSON.stringify(res.rows, null, 2));
  
  await client.end();
}

main().catch(console.error);
