import { fetchInstagramSummary } from '../controllers/crudController';

(async function(){
  const url = process.argv[2] || 'https://www.instagram.com/p/CsKQyYFnZ8j/';
  console.log('Testing Instagram extract for:', url);
  const s = await fetchInstagramSummary(url as string);
  console.log('Result:', s);
})();
