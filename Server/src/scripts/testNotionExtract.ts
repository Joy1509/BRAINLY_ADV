import { fetchNotionSummary } from '../controllers/crudController';

(async function(){
  const url = process.argv[2] || 'https://www.notion.so/';
  console.log('Testing Notion extract for:', url);
  const s = await fetchNotionSummary(url as string);
  console.log('Result:', s);
})();
