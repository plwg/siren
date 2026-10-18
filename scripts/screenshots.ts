// Regenerates the README screenshots, the link-preview image and the Apple touch icon from the
// built site: `bun run screenshots`.
// Needs Chromium for Playwright once: `bunx playwright-core install chromium`.

import { chromium } from 'playwright-core';
import { encodeDiagram } from '../src/hash';

const OUT = 'docs/screenshots';

// Siren's own deploy pipeline, top to bottom so it fills the diagram pane at a readable size.
const DIAGRAM = `flowchart TD
  push[Push to main] --> check[bun run check]
  check -->|passes| build[bun build]
  check -.->|fails| fix[Fix and push again]
  build --> pages{{GitHub Pages}}
  pages --> site([plwg.github.io/siren])`;

const SHOTS = [
  { name: 'desktop-light', theme: 'light' },
  { name: 'desktop-dark', theme: 'dark' },
  { name: 'desktop-contrast', theme: 'contrast' },
];

const server = Bun.serve({
  port: 0,
  fetch(req) {
    const path = new URL(req.url).pathname.replace(/^\/siren\/?$/, '/siren/index.html');
    if (!path.startsWith('/siren/')) return new Response('Not found', { status: 404 });
    return new Response(Bun.file(`dist/${path.slice('/siren/'.length)}`));
  },
});

const browser = await chromium.launch();
const errors: string[] = [];
try {
  for (const { name, theme } of SHOTS) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
    await context.addInitScript((t) => localStorage.setItem('siren-theme', t), theme);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
    await page.goto(`http://localhost:${server.port}/siren/#${encodeDiagram(DIAGRAM)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#diagram svg').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await context.close();
    console.log(`${OUT}/${name}.png`);
  }
} catch (error) {
  await browser.close();
  server.stop();
  throw error;
}

// Link previews (og:image): 1200 by 630 at one pixel per pixel, as chat apps and social sites expect.
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  await context.addInitScript(() => localStorage.setItem('siren-theme', 'contrast'));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`og: ${error.message}`));
  await page.goto(`http://localhost:${server.port}/siren/#${encodeDiagram(DIAGRAM)}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#diagram svg').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'public/og.png' });
  await context.close();
  console.log('public/og.png');
}

// The home-screen icon for iPhones: the favicon on a full square, since iOS rounds the corners.
{
  const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
  const svg = Buffer.from(await Bun.file('src/favicon.svg').arrayBuffer()).toString('base64');
  await page.setContent(
    `<body style="margin:0;background:#0a6c73"><img src="data:image/svg+xml;base64,${svg}" width="180" height="180"></body>`,
  );
  await page.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: 'public/apple-touch-icon.png' });
  await page.close();
  console.log('public/apple-touch-icon.png');
}
await browser.close();
server.stop();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
