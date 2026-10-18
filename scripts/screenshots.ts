// Regenerates the README screenshots from the built site: `bun run screenshots`.
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
} finally {
  await browser.close();
  server.stop();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
