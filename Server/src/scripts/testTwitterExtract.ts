import { fetchTwitterSummary } from '../controllers/crudController';

(async function(){
  const url = process.argv[2] || 'https://twitter.com/jack/status/20';
  console.log('Testing Twitter extract for:', url);
  const s = await fetchTwitterSummary(url as string);
  console.log('Result:', s);
})();
