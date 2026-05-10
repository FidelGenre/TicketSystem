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
  console.log('Setting pendingTitle for Obra de Teatro Infantil...');
  const res = await client.query(`
    UPDATE events 
    SET "pendingTitle" = 'Obra de Teatro Infantil: El Mundo de Oz - EDITADO' 
    WHERE id = 'b304a4b8-9e79-4db2-bc6e-532179fcc7e2';
  `);
  console.log('Update result:', res.rowCount);
  await client.end();
}

main().catch(console.error);
