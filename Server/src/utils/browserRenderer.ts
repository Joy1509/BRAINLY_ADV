import { chromium, Browser, BrowserContext } from 'playwright';

let browser: Browser | null = null;

async function getBrowser() {
  if (browser) return browser;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  return browser;
}

export async function renderPage(url: string, timeout = 15000): Promise<string | undefined> {
  try {
    const b = await getBrowser();
    const context = await b.newContext({ bypassCSP: true });
    const page = await context.newPage();
    // Use networkidle load strategy and give a bit more time for client rendering
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    // wait a short moment to allow dynamic content to settle
    await page.waitForTimeout(1500);
    const content = await page.content();
    await page.close();
    await context.close();
    return content;
  } catch (err) {
    // If Playwright fails (missing browsers or OS restrictions), just return undefined.
    console.error('Playwright render error:', (err as any).message || err);
    return undefined;
  }
}

export async function warmUp(): Promise<void> {
  try {
    await getBrowser();
    console.info('Playwright browser warmed up');
  } catch (err) {
    console.warn('Playwright warm-up failed:', (err as any).message || err);
  }
}

export async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
    }
  } catch (err) {
    console.error('Error closing browser', err);
  }
}

// ensure graceful shutdown
process.on('exit', () => { if (browser) browser.close().catch(()=>{}); });
process.on('SIGINT', () => { if (browser) browser.close().catch(()=>{}); process.exit(0); });
process.on('SIGTERM', () => { if (browser) browser.close().catch(()=>{}); process.exit(0); });