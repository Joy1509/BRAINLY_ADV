interface YouTubeMetadata {
  title: string;
  description: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  publishedAt?: string;
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata | null> {
  try {
    let videoId: string | undefined;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes('youtu.be')) {
        videoId = u.pathname.replace(/^\//, '').split(/\?|&/)[0];
      } else {
        videoId = u.searchParams.get('v') ||
          (u.pathname.match(/\/shorts\/(\w+)/)?.[1]) ||
          (u.pathname.match(/\/embed\/(\w+)/)?.[1]) ||
          (u.pathname.match(/\/live\/(\w+)/)?.[1]);
      }
    } catch (e) {
      return null;
    }

    if (!videoId) return null;

    // Use YouTube Data API if key is available
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
        const res = await fetch(api);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            console.log('YouTube API: fetched metadata for', videoId);
            return {
              title: item.snippet.title,
              description: item.snippet.description,
              channelName: item.snippet.channelTitle,
              duration: item.contentDetails?.duration,
              viewCount: item.statistics?.viewCount,
              publishedAt: item.snippet.publishedAt
            };
          }
        }
      } catch (e) {
        console.warn('YouTube API failed:', e);
      }
    }

    // Fallback: scrape oEmbed for title
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const r = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok) {
        const j = await r.json();
        if (j?.title) {
          return {
            title: j.title,
            description: j.title,
            channelName: j.author_name
          };
        }
      }
    } catch (e) {
      console.warn('oEmbed fallback failed:', e);
    }

    return null;
  } catch (error) {
    console.error('fetchYouTubeMetadata error:', error);
    return null;
  }
}

export async function generateAISummary(metadata: YouTubeMetadata): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set, using raw description');
    return metadata.description?.slice(0, 500) || metadata.title;
  }

  try {
    const prompt = `Summarize this YouTube video in 2-3 clear sentences based on the info below. Only return the summary, no extra text.

Title: ${metadata.title}
Channel: ${metadata.channelName || 'Unknown'}
Description: ${metadata.description?.slice(0, 1000) || 'No description'}`;

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
        console.log('OpenRouter: generated summary successfully');
        return summary;
      }
    } else {
      console.warn('OpenRouter API error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('OpenRouter error:', error);
  }

  // Fallback to raw description
  return metadata.description?.slice(0, 500) || metadata.title;
}
