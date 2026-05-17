const http = require('http');

const ports = [3000, 3001, 3002, 3003, 3005, 4000, 5000, 8000, 8080];

ports.forEach(port => {
  http.get(`http://localhost:${port}/api/events?limit=16`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.events) {
          console.log(`SUCCESS on port ${port}! Events count:`, parsed.events.length);
          parsed.events.forEach(ev => {
            console.log(`- "${ev.title}" | minPrice: ${ev.minPrice} | maxPrice: ${ev.maxPrice}`);
          });
        }
      } catch (e) {}
    });
  }).on('error', () => {});
});
