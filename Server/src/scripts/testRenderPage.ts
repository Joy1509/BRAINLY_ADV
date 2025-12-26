import dotenv from 'dotenv';
dotenv.config();
import { renderPage } from '../utils/browserRenderer';

async function main() {
  const url = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript';
  console.log('Rendering:', url);
  const html = await renderPage(url, 20000);
  if (!html) {
    console.log('No HTML returned');
    process.exit(1);
  }
  console.log('HTML length:', html.length);

  // Extract meta description via regex
  const metaMatch = html.match(/<meta[^>]*(?:property|name)=["'](?:og:description|description|twitter:description)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const meta = metaMatch ? metaMatch[1] : null;
  console.log('Meta (regex):', meta ? meta.slice(0,200) : '<none>');

  // Count paragraphs via regex
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paraMatches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 20) paraMatches.push(text);
  }
  console.log('Paragraphs found:', paraMatches.length);
  console.log('First para (regex):', paraMatches[0] ? paraMatches[0].slice(0,200) : '<none>');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });