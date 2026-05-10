const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345a',
  database: 'ticketsystemdb',
});

async function main() {
  await client.connect();
  console.log('Generating bcrypt hash for 123456...');
  const hash = await bcrypt.hash('123456', 10);
  console.log('Hash generated:', hash);
  
  console.log('Updating admin password hash...');
  const res = await client.query(`
    UPDATE users 
    SET "passwordHash" = $1 
    WHERE email = 'admin@lpticket.com';
  `, [hash]);
  
  console.log('Update rows affected:', res.rowCount);
  await client.end();
}

main().catch(console.error);
