import 'dotenv/config';
import { fetchYouTubeDescription } from '../controllers/crudController';

async function main() {
  const url = 'https://youtu.be/yqNPHCLJktc?si=3I-IxfUo2MGUzP9q';
  console.log('Testing YouTube extract for:', url);
  const s = await fetchYouTubeDescription(url as any);
  console.log('Result:', s || '<no result>');
}

main().catch(err=>{console.error(err); process.exit(1)});