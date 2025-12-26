import 'dotenv/config';
import { generateSummary } from '../controllers/crudController';

async function main() {
  const url = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript';
  console.log('Testing generateSummary for:', url);
  const s = await generateSummary(url);
  console.log('---- SUMMARY START ----');
  console.log(s || '<no summary>');
  console.log('---- SUMMARY END ----');
}

main().catch(err => {
  console.error('Error in test:', err);
  process.exit(1);
});