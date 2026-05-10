async function main() {
  const url = 'http://localhost:3001/uploads/1778420536680-71685642.jpg';
  console.log('Fetching static file from:', url);
  const res = await fetch(url);
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
}

main().catch(console.error);
