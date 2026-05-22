const { Client } = require('pg');

async function seed() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '12345a', database: 'ticketsystemdb' });
  await c.connect();
  console.log('Connected');

  const eventId = 'cf4bb53f-fd2b-484b-aa63-e564c2f46050';

  // Get section
  let sectionRes = await c.query('SELECT id FROM venue_sections WHERE "eventId" = $1 LIMIT 1', [eventId]);
  const sectionId = sectionRes.rows[0]?.id;
  if (!sectionId) { console.log('No section!'); process.exit(1); }
  console.log('Section:', sectionId);

  // Check order columns
  const orderCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`);
  console.log('Order columns:', orderCols.rows.map(x => x.column_name));

  const users = [
    { id: 'd1d731ad-9181-4348-b8cf-07e46dd294c6', label: 'Admin', interests: 'business,music_party,professional_networking', industry: 'Marketing', ig: '@adminuser' },
    { id: 'ee168bfc-1ca2-44ed-89b5-8cc55539eb24', label: 'Client', interests: 'business,singles,music_party,make_friends', industry: 'Marketing', ig: '@clientetest' },
    { id: '645d9c97-5c3a-4263-acd8-41d788001b6e', label: 'TestUser', interests: 'business,collaborations,vip_experience', industry: 'Tech', ig: '@testuser' },
  ];

  for (const u of users) {
    // Check if already has ticket for this event
    const t = await c.query('SELECT id FROM tickets WHERE "userId" = $1 AND "eventId" = $2', [u.id, eventId]);
    if (!t.rows.length) {
      // Create order first
      const ordRes = await c.query(
        `INSERT INTO orders (id, "userId", "eventId", subtotal, total, "ticketCount", status, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, 25.00, 25.00, 1, 'paid', NOW()) RETURNING id`,
        [u.id, eventId]
      );
      const orderId = ordRes.rows[0].id;
      
      const code = 'SM' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await c.query(
        `INSERT INTO tickets (id, "orderId", "userId", "eventId", "sectionId", "rowLabel", "seatNumber", "ticketCode", status, price, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'GA', 1, $5, 'active', 25.00, NOW())`,
        [orderId, u.id, eventId, sectionId, code]
      );
      console.log('Created order + ticket for', u.label);
    } else {
      console.log(u.label, 'already has ticket');
    }

    // SM preference
    const p = await c.query('SELECT id FROM social_match_preferences WHERE "userId" = $1 AND "eventId" = $2', [u.id, eventId]);
    if (p.rows.length) {
      await c.query(
        `UPDATE social_match_preferences SET "isActive" = true, interests = $3, industry = $4, instagram = $5, "privateMode" = false, "invisibleMode" = false, "shareInstagram" = true, "shareLocation" = true WHERE "userId" = $1 AND "eventId" = $2`,
        [u.id, eventId, u.interests, u.industry, u.ig]
      );
      console.log('Updated SM for', u.label);
    } else {
      await c.query(
        `INSERT INTO social_match_preferences (id, "userId", "eventId", "isActive", interests, industry, instagram, "privateMode", "invisibleMode", "shareInstagram", "shareLocation", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, true, $3, $4, $5, false, false, true, true, NOW(), NOW())`,
        [u.id, eventId, u.interests, u.industry, u.ig]
      );
      console.log('Created SM for', u.label);
    }
  }

  // Clear connections
  await c.query('DELETE FROM social_match_connections WHERE "eventId" = $1', [eventId]);
  console.log('Cleared connections');

  console.log('\n✅ Done! Login as admin@lpticket.com (password: admin123)');
  console.log('Go to Social Match tab, select event "a", and you should see 2 swipeable profiles!');
  await c.end();
}

seed().catch(console.error);
