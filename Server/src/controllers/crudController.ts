import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import userContent from "../models/contentModel";
import cheerio from "cheerio";
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';
const execFileP = util.promisify(execFile);

async function generateSummary(url: string): Promise<string | undefined> {
  try {
    console.log('generateSummary: start', url);
    // Normalize URL: add protocol if missing
    let fetchUrl = url;
    if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = `https://${fetchUrl}`;

    // Domain-specific handlers
    try {
      const u = new URL(fetchUrl);
      const host = u.hostname.toLowerCase();
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const yt = await fetchYouTubeDescription(fetchUrl);
        if (yt) {
          console.log('generateSummary: got youtube description');
          return yt.slice(0, 800).trim();
        }
      }

      if (host.includes('twitter.com') || host.includes('x.com')) {
        const tw = await fetchTwitterSummary(fetchUrl);
        if (tw) {
          console.log('generateSummary: got twitter summary');
          return tw.slice(0, 800).trim();
        }
      }

      if (host.includes('instagram.com') || host.includes('instagr.am')) {
        const ig = await fetchInstagramSummary(fetchUrl);
        if (ig) {
          console.log('generateSummary: got instagram summary');
          return ig.slice(0, 800).trim();
        }
      }

      if (host.includes('notion.so') || host.includes('notion.site')) {
        const nt = await fetchNotionSummary(fetchUrl);
        if (nt) {
          console.log('generateSummary: got notion summary');
          return nt.slice(0, 800).trim();
        }
      }
    } catch (e) {
      // ignore URL parse errors
    }

    console.log('generateSummary: trying static fetch', 'PLAYWRIGHT_ENABLED=', process.env.PLAYWRIGHT_ENABLED);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(fetchUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
    clearTimeout(timeout);
    console.log('generateSummary: fetch status', response.status);
    if (!response.ok) {
      console.log('generateSummary: fetch failed, skipping');
      return undefined;
    }
    const html = await response.text();
    console.log('generateSummary: fetched html length', html.length);
    const $ = cheerio.load(html);

    // 1) Try common meta description locations (accept shorter descriptions)
    const metaSelectors = [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]'
    ];
    try {
      for (const sel of metaSelectors) {
        const el = $(sel);
        const content = el ? el.attr('content') : undefined;
        console.log('generateSummary: checking meta', sel, !!content ? content.slice(0,80) : '<none>');
        if (content && content.trim().length >= 20) return content.trim().slice(0, 600);
      }
      console.log('generateSummary: no meta found');
    } catch (metaErr) {
      console.warn('generateSummary: meta loop error', (metaErr as any).message || metaErr);
    }

    // 2) Try article or main content blocks (prefer structured content)
    const articleText = $('article').text().replace(/\s+/g, ' ').trim();
    if (articleText && articleText.length > 0) {
      const paras = $('article p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 20);
      if (paras.length >= 1) return paras.slice(0, 4).join(' ').slice(0, 600).trim();
      // fallback to first chunk of article text if article exists
      return articleText.slice(0, 600).trim();
    }

    // 3) Fallback: collect meaningful <p> tags across the document with more leniency
    const paragraphs = $('p')
      .map((i, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter((p) => p.length >= 30);
    if (paragraphs.length > 0) {
      return paragraphs.slice(0, 4).join(' ').slice(0, 600).trim();
    }

    // 4) Try heading + short body extract (more sentences)
    const h1 = $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (bodyText) {
      const sentences = bodyText.match(/[^.!?]+[.!?]+/g) || [];
      const head = h1.length > 0 ? `${h1}. ` : '';
      if (sentences.length > 0) return (head + sentences.slice(0, 3).join(' ')).slice(0, 600).trim();
    }

    // 5) Try Playwright renderer as a last resort (JS-heavy pages)
    if (process.env.PLAYWRIGHT_ENABLED === 'true') {
      console.log('generateSummary: attempting Playwright fallback');
      try {
        // Importing dynamically so Playwright isn't required unless used
        const { renderPage } = await import("../utils/browserRenderer");
        const rendered = await renderPage(fetchUrl, 15000);
        console.log('generateSummary: Playwright returned length', rendered?.length || 0);
        if (rendered) {
          const $$ = cheerio.load(rendered);
          const paras2 = $$('p').map((i, el) => $$(el).text().replace(/\s+/g, ' ').trim()).get().filter((p) => p.length >= 30);
          if (paras2.length > 0) return paras2.slice(0,4).join(' ').slice(0,600).trim();
          const meta2 = $$('meta[property="og:description"]').attr('content') || $$('meta[name="description"]').attr('content') || $$('meta[name="twitter:description"]').attr('content');
          if (meta2 && meta2.trim().length > 20) return meta2.trim().slice(0,600);
          const body2 = $$.root().text().replace(/\s+/g, ' ').trim();
          const sentences2 = body2.match(/[^.!?]+[.!?]+/g) || [];
          if (sentences2.length > 0) return sentences2.slice(0,3).join(' ').slice(0,600).trim();
        }
      } catch (err) {
        // Ignore Playwright errors — it may not be available in this environment (e.g., no browsers installed)
        console.warn('Playwright fallback failed (silent):', (err as any).message || err);
      }
    }

    // 6) As a last resort, invoke the Python summarizer script (best-effort, with timeout)
    try {
      const scriptPath = path.resolve(__dirname, '../scripts/generate_summary.py');
      const args = [scriptPath, fetchUrl];
      // Try JS rendering in the Python script if Playwright is enabled there too
      if (process.env.PLAYWRIGHT_ENABLED === 'true') args.push('--js');
      console.log('generateSummary: invoking python script', scriptPath, args.slice(1));
      const { stdout, stderr } = await execFileP('python', args, { timeout: 20000, maxBuffer: 1024 * 500 });
      if (stderr) console.warn('python summarizer stderr:', stderr.toString().slice(0, 500));
      const out = stdout ? stdout.toString().trim() : '';
      if (out && !out.startsWith('No useful summary')) {
        console.log('generateSummary: python produced summary length', out.length);
        return out.slice(0, 800).trim();
      }
    } catch (err) {
      console.warn('Python summarizer failed (silent):', (err as any).message || err);
    }

    return undefined;
  } catch (err) {
    // silently fail and return undefined so we don't block saving
    return undefined;
  }
}

export const newContent = async(req: AuthRequest,res: Response)=>{
  try{
    const {link,contentType,title,tag,tags} = req.body;
    const userid = req.userID; 

    //checking whether user given all the field or not
    if (!link || !contentType || !title || !userid) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Try to generate a summary for the link (best-effort)
    const summary = link ? await generateSummary(link) : undefined;

    const contentCreated = new userContent({
      link:link,
      contentType:contentType,
      title:title,
      // Keep legacy `tag` (first tag) for compatibility
      tag: tag || (Array.isArray(tags) && tags.length > 0 ? tags[0] : undefined),
      // Persist all tags as an array
      tags: Array.isArray(tags) ? tags : (tag ? [tag] : []),
      // optional summary
      summary: summary || "",
      userId:userid
    })

    await contentCreated.save();
    res.status(200).json({
      message: "Content saved Successfully"
    })
    return;
  }catch(err){
    console.log("Err(catch): something went wrong",err)
    return;
  }
}

export const content = async(req: AuthRequest, res: Response)=>{
  try{
    const userid = req.userID;

    //checking userid present or not
    if(!userid){
      res.status(400).json({ message: "Something wrong" });
      return;
    }

    const userData = await userContent.find({ userId: userid });
    res.status(200).json({
      message: "User data fetched successfully",
      data: userData,
    });
    console.log(userData)
  }catch(err){
    console.log("Err(catch): something went wrong",err)
    return;
  }
}

export const deleteContent = async(req: AuthRequest, res: Response)=>{
  try{
    const userid = req.userID;
    const userTitle = req.params.contentId;
    
    console.log("userid =>", userid)
    console.log("contentid =>", userTitle)

    if (!userid || !userTitle) {
       res.status(400).json({ message: "User ID or Content ID missing" });
       return;
    }

    const content = await userContent.findOne({ title: userTitle, userId: userid });

    if (!content) {
      res.status(404).json({ message: "Content not found or unauthorized" });
      return;
    }

    await userContent.findByIdAndDelete(content);

     res.status(200).json({ message: "Content deleted successfully" });
     return;
  }catch(err){
    console.log("Err(catch): something went wrong",err)
    return;
  }
}

export const shareContent = async(req: AuthRequest, res: Response)=>{
  const { userId } = req.params;
  try {
    const documents = await userContent.find({ userId });
    res.status(200).json({ data: documents });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Export generateSummary for maintenance scripts (e.g., to backfill existing documents)
export { generateSummary, fetchYouTubeDescription, fetchTwitterSummary, fetchNotionSummary, fetchInstagramSummary };

async function fetchInstagramSummary(url: string): Promise<string | undefined> {
  try {
    // Static fetch + meta tags
    try {
      let fetchUrl = url;
      if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = `https://${fetchUrl}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(fetchUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      clearTimeout(timeout);
      if (!response.ok) return undefined;
      const html = await response.text();
      const $ = cheerio.load(html);

      // Instagram often uses og:description and meta tags containing the caption
      const meta = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
      if (meta && meta.trim().length > 20) return meta.trim().slice(0,600);

      // Try to pick up script-based json that sometimes includes caption
      const ld = $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get();
      for (const s of ld) {
        try {
          const parsed = JSON.parse(s || '{}');
          const desc = (parsed as any).description || (parsed as any).caption || (parsed as any).articleBody;
          if (desc && typeof desc === 'string' && desc.trim().length > 20) return desc.trim().slice(0,600);
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    // Playwright render fallback (for JS-heavy Instagram content)
    if (process.env.PLAYWRIGHT_ENABLED === 'true') {
      try {
        const { renderPage } = await import('../utils/browserRenderer');
        const rendered = await renderPage(url, 15000);
        if (rendered) {
          const $$ = cheerio.load(rendered);
          const meta2 = $$('meta[property="og:description"]').attr('content') || $$('meta[name="description"]').attr('content');
          if (meta2 && meta2.trim().length > 20) return meta2.trim().slice(0,600);
          const bodyText = $$.root().text().replace(/\s+/g, ' ').trim();
          const sentences = bodyText.match(/[^.!?]+[.!?]+/g) || [];
          if (sentences.length > 0) return sentences.slice(0,3).join(' ').slice(0,600).trim();
        }
      } catch (err) {
        // ignore
      }
    }

    // Fallback to Python summarizer as a last resort
    try {
      const scriptPath = path.resolve(__dirname, '../scripts/generate_summary.py');
      const args = [scriptPath, url];
      if (process.env.PLAYWRIGHT_ENABLED === 'true') args.push('--js');
      const { stdout, stderr } = await execFileP('python', args, { timeout: 20000, maxBuffer: 1024 * 500 });
      if (stderr) console.warn('instagram python summarizer stderr:', stderr.toString().slice(0, 500));
      const out = stdout ? stdout.toString().trim() : '';
      if (out && !out.startsWith('No useful summary')) return out.slice(0, 800).trim();
    } catch (err) {
      // ignore
    }

    return undefined;
  } catch (err) {
    return undefined;
  }
}

async function fetchTwitterSummary(url: string): Promise<string | undefined> {
  try {
    // Try oEmbed first (gives embedded HTML and author info)
    try {
      const oembed = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const r = await fetch(oembed, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      if (r.ok) {
        const j = await r.json();
        // j.html contains the embed markup; strip tags to get the tweet text
        if (j && j.html) {
          const text = j.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (text.length > 0) return text.slice(0, 600).trim();
        }
      }
    } catch (e) {
      // ignore oEmbed failures
    }

    // Next, try to fetch meta tags from the tweet page
    try {
      let fetchUrl = url;
      if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = `https://${fetchUrl}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(fetchUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      clearTimeout(timeout);
      if (!response.ok) return undefined;
      const html = await response.text();
      const $ = cheerio.load(html);
      const meta = $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
      if (meta && meta.trim().length > 0) return meta.trim().slice(0, 600);

      // Sometimes the tweet text is in og:title
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle && ogTitle.trim().length > 0) return ogTitle.trim().slice(0, 600);
    } catch (e) {
      // ignore
    }

    // Try Playwright render if available
    if (process.env.PLAYWRIGHT_ENABLED === 'true') {
      try {
        const { renderPage } = await import('../utils/browserRenderer');
        const rendered = await renderPage(url, 15000);
        if (rendered) {
          const $$ = cheerio.load(rendered);
          const meta2 = $$('meta[property="og:description"]').attr('content') || $$('meta[name="twitter:description"]').attr('content');
          if (meta2 && meta2.trim().length > 0) return meta2.trim().slice(0, 600);
          const bodyText = $$.root().text().replace(/\s+/g, ' ').trim();
          const sentences = bodyText.match(/[^.!?]+[.!?]+/g) || [];
          if (sentences.length > 0) return sentences.slice(0,3).join(' ').slice(0,600).trim();
        }
      } catch (err) {}
    }

    return undefined;
  } catch (err) {
    return undefined;
  }
}

async function fetchNotionSummary(url: string): Promise<string | undefined> {
  try {
    // Notion often includes og meta tags; try static fetch first
    try {
      let fetchUrl = url;
      if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = `https://${fetchUrl}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(fetchUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      clearTimeout(timeout);
      if (!response.ok) return undefined;
      const html = await response.text();
      const $ = cheerio.load(html);

      // Prefer og:description or twitter:description
      const meta = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
      if (meta && meta.trim().length > 20) return meta.trim().slice(0, 600);

      // Try to assemble from title + first paragraphs
      const title = $('meta[property="og:title"]').attr('content') || $('title').text();
      const paras = $('p').map((i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get().filter(p => p.length > 30);
      if (paras.length > 0) return `${title ? title + '. ' : ''}${paras.slice(0,3).join(' ')}`.slice(0,600).trim();
    } catch (e) {
      // ignore
    }

    // Playwright render as fallback for JS-heavy Notion pages
    if (process.env.PLAYWRIGHT_ENABLED === 'true') {
      try {
        const { renderPage } = await import('../utils/browserRenderer');
        const rendered = await renderPage(url, 15000);
        if (rendered) {
          const $$ = cheerio.load(rendered);
          const meta2 = $$('meta[property="og:description"]').attr('content') || $$('meta[name="description"]').attr('content');
          if (meta2 && meta2.trim().length > 20) return meta2.trim().slice(0,600);
          const title = $$('meta[property="og:title"]').attr('content') || $$.root().find('h1').first().text().trim();
          const paras2 = $$('p').map((i, el) => $$(el).text().replace(/\s+/g, ' ').trim()).get().filter(p => p.length > 30);
          if (paras2.length > 0) return `${title ? title + '. ' : ''}${paras2.slice(0,3).join(' ')}`.slice(0,600).trim();
        }
      } catch (err) {}
    }

    // Last resort: invoke the Python summarizer used elsewhere in the file
    try {
      const scriptPath = path.resolve(__dirname, '../scripts/generate_summary.py');
      const args = [scriptPath, url];
      if (process.env.PLAYWRIGHT_ENABLED === 'true') args.push('--js');
      const { stdout, stderr } = await execFileP('python', args, { timeout: 20000, maxBuffer: 1024 * 500 });
      if (stderr) console.warn('notion python summarizer stderr:', stderr.toString().slice(0, 500));
      const out = stdout ? stdout.toString().trim() : '';
      if (out && !out.startsWith('No useful summary')) return out.slice(0, 800).trim();
    } catch (err) {
      // ignore
    }

    return undefined;
  } catch (err) {
    return undefined;
  }
}

async function fetchYouTubeDescription(url: string): Promise<string | undefined> {
  try {
    // normalize and extract video id
    let videoId: string | undefined;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes('youtu.be')) {
        videoId = u.pathname.replace(/^\//, '').split(/\?|&/)[0];
      } else {
        videoId = u.searchParams.get('v') || (u.pathname.match(/\/shorts\/(\w+)/)?.[1]) || (u.pathname.match(/\/embed\/(\w+)/)?.[1]);
      }
    } catch (e) {
      // ignore
    }

    // 1) Try oEmbed first (gives title), then YouTube Data API if key present for full description
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const r = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      if (r.ok) {
        const j = await r.json();
        if (j && j.title) {
          // Use title as a short summary if no better description is found
          const t = (j.title as string).trim();
          if (t.length > 0) return t;
        }
      }
    } catch (e) {
      // ignore oEmbed failures
    }

    if (videoId && process.env.YOUTUBE_API_KEY) {
      try {
        const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
        const res = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
        if (res.ok) {
          const j = await res.json();
          if (j.items && j.items.length > 0 && j.items[0].snippet) {
            const desc = j.items[0].snippet.description;
            const title = j.items[0].snippet.title;
            if (desc && desc.trim().length > 0) return desc.trim();
            if (title && title.trim().length > 0) return title.trim();
          }
        }
      } catch (e) {
        console.warn('YouTube API failed:', (e as any).message || e);
      }
    }

    // 2) Try static HTML meta/ld+json extraction
    try {
      let fetchUrl = url;
      if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = `https://${fetchUrl}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(fetchUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
      clearTimeout(timeout);
      if (!response.ok) return undefined;
      const html = await response.text();
      // meta tags
      const $ = cheerio.load(html);
      const meta = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
      if (meta && meta.trim().length > 20) return meta.trim();

      // json-ld
      const ld = $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get();
      for (const s of ld) {
        try {
          const parsed = JSON.parse(s || '{}');
          if (parsed && typeof parsed === 'object') {
            const desc = (parsed as any).description || (parsed as any).shortDescription;
            if (desc && typeof desc === 'string' && desc.trim().length > 20) return desc.trim();
          }
        } catch (e) {
          // ignore
        }
      }

      // fallback: look for shortDescription in the HTML using regex
      const shortMatch = html.match(/"shortDescription"\s*:\s*"([\s\S]{20,})"/);
      if (shortMatch && shortMatch[1]) return shortMatch[1].trim();
    } catch (e) {
      // ignore
    }

    // 3) As a last resort, use Playwright rendered page if enabled
    if (process.env.PLAYWRIGHT_ENABLED === 'true') {
      try {
        const { renderPage } = await import('../utils/browserRenderer');
        const rendered = await renderPage(url, 15000);
        if (rendered) {
          const $$ = cheerio.load(rendered);
          const meta2 = $$('meta[name="description"]').attr('content') || $$('meta[property="og:description"]').attr('content');
          if (meta2 && meta2.trim().length > 20) return meta2.trim();
          const ld = $$('script[type="application/ld+json"]').map((i, el) => $$(el).html()).get();
          for (const s of ld) {
            try {
              const parsed = JSON.parse(s || '{}');
              const desc = (parsed as any).description || (parsed as any).shortDescription;
              if (desc && typeof desc === 'string' && desc.trim().length > 20) return desc.trim();
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('YouTube render fallback failed:', (e as any).message || e);
      }
    }

    return undefined;
  } catch (err) {
    return undefined;
  }
}
