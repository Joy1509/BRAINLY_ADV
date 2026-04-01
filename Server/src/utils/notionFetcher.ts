import cheerio from 'cheerio';

interface NotionMetadata {
  title: string;
  description: string;
}

function extractNotionPageId(url: string): string | null {
  try {
    const u = new URL(url);
    // Format: notion.so/Title-pageId or notion.so/workspace/Title-pageId
    const pathname = u.pathname;

    // Try to extract 32-char hex ID with or without dashes
    const match = pathname.match(/([a-f0-9]{32})|([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) return match[0].replace(/-/g, '');

    // Fallback: last segment after last dash
    const segments = pathname.split('-');
    const last = segments[segments.length - 1].split('?')[0];
    if (last.length >= 20) return last;

    return null;
  } catch {
    return null;
  }
}

async function fetchNotionBlocks(pageId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!res.ok) return '';

    const data = await res.json();
    const texts: string[] = [];

    for (const block of data.results || []) {
      const type = block.type;
      const content = block[type];
      if (content?.rich_text) {
        const text = content.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) texts.push(text.trim());
      }
      if (texts.length >= 5) break;
    }

    return texts.join(' ').slice(0, 600);
  } catch {
    return '';
  }
}

export async function fetchNotionMetadata(url: string): Promise<NotionMetadata | null> {
  const pageId = extractNotionPageId(url);
  console.log('Notion: extracted pageId', pageId, 'from', url);

  // 1) Try Notion API
  if (pageId && process.env.NOTION_API_KEY) {
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (res.ok) {
        const data = await res.json();

        // Extract title from properties
        let title = '';
        const props = data.properties || {};
        for (const key of ['title', 'Title', 'Name', 'name']) {
          const prop = props[key];
          if (prop?.title) {
            title = prop.title.map((t: any) => t.plain_text).join('').trim();
            if (title) break;
          }
        }

        // Fetch block content for description
        const description = await fetchNotionBlocks(pageId);

        if (title || description) {
          console.log('Notion API: fetched successfully');
          return { title: title || 'Notion Page', description };
        }
      } else {
        console.warn('Notion API response:', res.status, await res.text());
      }
    } catch (e) {
      console.warn('Notion API failed:', e);
    }
  }

  // 2) Fallback: scrape og meta tags (works for public/template pages)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="twitter:title"]').attr('content') ||
                   $('title').text() || '';

      const description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') || '';

      if (title || description) {
        console.log('Notion scrape: fetched via og tags', { title, description });
        return { title: title.trim(), description: description.trim() };
      }
    }
  } catch (e) {
    console.warn('Notion scrape failed:', e);
  }

  // 3) Hardcoded fallback for known Notion public pages
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.includes('templates')) {
      return {
        title: 'Notion Templates',
        description: 'Browse thousands of Notion templates for productivity, project management, notes, wikis, and more. Find the perfect template to get started.'
      };
    }
    if (path === '/' || path === '') {
      return {
        title: 'Notion',
        description: 'Notion is an all-in-one workspace for notes, tasks, wikis, and databases. Connect your work and boost productivity.'
      };
    }
  } catch (e) {}

  return null;
}

export async function generateNotionSummary(metadata: NotionMetadata): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    return metadata.description || metadata.title;
  }

  if (!metadata.description) return metadata.title;

  try {
    const prompt = `Summarize this Notion page in 2-3 sentences based on the info below. Only return the summary, no extra text.

Title: ${metadata.title}
Content: ${metadata.description}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Second Brain'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.5
      })
    });

    if (response.ok) {
      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content?.trim();
      if (summary) {
        console.log('OpenRouter: Notion summary generated');
        return summary;
      }
    }
  } catch (e) {
    console.error('OpenRouter Notion error:', e);
  }

  return metadata.description || metadata.title;
}
