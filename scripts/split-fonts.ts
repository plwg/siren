// Moves the self-hosted fonts out of the built stylesheet into files of their own, still served
// from Siren's own origin. The bundler embeds each font in the CSS as base64, which makes the
// render-blocking stylesheet wait for every face, used or not, and base64 is a third larger than
// the font. As files, the browser fetches only the faces a page uses, while text shows at once
// (font-display: swap). They aren't preloaded: the stylesheet names them early enough, and
// preloading slowed the first diagram by competing with the script for bandwidth.
//
//   bun scripts/split-fonts.ts    after bun build, rewrites dist/ in place

import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { Glob } from 'bun';

mkdirSync('dist/fonts', { recursive: true });
let files = 0;
const writes: Promise<number>[] = [];

for (const css of new Glob('dist/**/*.css').scanSync()) {
  const text = await Bun.file(css).text();
  const out = text.replace(/@font-face\s*\{[^}]*\}/g, (face) => {
    const family = face.match(/font-family:\s*"?([^";]+?)"?\s*[;}]/)?.[1];
    const weight = face.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
    return face.replace(/url\(\s*["']?data:font\/woff2;base64,([A-Za-z0-9+/=]+)["']?\s*\)/, (_, data: string) => {
      const bytes = Buffer.from(data, 'base64');
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
      const name = `${(family ?? 'font').toLowerCase().replace(/\s+/g, '-')}-${weight}-${hash}.woff2`;
      writes.push(Bun.write(`dist/fonts/${name}`, bytes));
      files++;
      return `url(${relative(dirname(css), `dist/fonts/${name}`)})`;
    });
  });
  if (out.includes('data:font/')) throw new Error(`${css}: a font is still embedded`);
  await Bun.write(css, out);
}
await Promise.all(writes);

console.log(`Fonts: ${files} files in dist/fonts`);
