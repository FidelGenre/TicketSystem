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

  console.log('Fetching all events...');
  const eventsRes = await client.query('SELECT id, title FROM events');
  const events = eventsRes.rows;

  for (const event of events) {
    console.log(`Processing event: ${event.title} (${event.id})`);
    
    // Fetch sections for this event
    const sectionsRes = await client.query('SELECT id, "sectionType", price, "seatsConfig" FROM venue_sections WHERE "eventId" = $1', [event.id]);
    const sections = sectionsRes.rows;
    
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    for (const s of sections) {
      if (s.sectionType === 'stage' || s.sectionType === 'decor') {
        console.log(`  Skipping non-purchasable section: ${s.id} (${s.sectionType})`);
        continue;
      }
      
      const seatsRes = await client.query('SELECT id, "rowLabel", "seatNumber" FROM seats WHERE "sectionId" = $1', [s.id]);
      const seats = seatsRes.rows;
      
      let config = {};
      try {
        if (s.seatsConfig) config = JSON.parse(s.seatsConfig);
      } catch (e) {}

      if (seats.length === 0) {
        const p = Number(s.price);
        if (p < minPrice) minPrice = p;
        if (p > maxPrice) maxPrice = p;
      } else {
        for (const seat of seats) {
          const key = s.sectionType === 'table' ? `seat-${seat.seatNumber}` : `${seat.rowLabel}-${seat.seatNumber}`;
          const seatPrice = (config[key] && config[key].price !== undefined && config[key].price !== null) 
            ? Number(config[key].price) 
            : Number(s.price);
            
          if (seatPrice < minPrice) minPrice = seatPrice;
          if (seatPrice > maxPrice) maxPrice = seatPrice;
        }
      }
    }
    
    if (minPrice === Infinity) minPrice = 0;
    if (maxPrice === -Infinity) maxPrice = 0;
    
    console.log(`  Calculated minPrice: ${minPrice}, maxPrice: ${maxPrice}`);
    await client.query('UPDATE events SET "minPrice" = $1, "maxPrice" = $2 WHERE id = $3', [minPrice, maxPrice, event.id]);
  }

  console.log('Done!');
  await client.end();
}

main().catch(console.error);
