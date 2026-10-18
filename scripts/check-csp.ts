// Checks that each built page's Content Security Policy allows its inline scripts by hash.
// Editing the inline theme script changes its hash; this fails the build until the policy is
// updated, rather than letting the deployed page block its own script. The editor and the About
// page carry the same script, so they share one hash.
//
//   bun scripts/check-csp.ts            check every page in dist/
//   bun scripts/check-csp.ts --write    update the hash in the source pages

import { createHash } from 'node:crypto';
import { Glob } from 'bun';

const SOURCES = ['index.html', 'about/index.html'];
const write = process.argv.includes('--write');
const files = write ? SOURCES : [...new Glob('dist/**/*.html').scanSync()];

let failed = false;
for (const file of files) {
  const html = await Bun.file(file).text();
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
  if (!policy) {
    console.error(`${file}: no Content-Security-Policy meta tag`);
    failed = true;
    continue;
  }
  // Inline scripts without attributes run; JSON-LD and other data blocks don't, so need no hash.
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    ([, body]) =>
      `'sha256-${createHash('sha256')
        .update(body ?? '')
        .digest('base64')}'`,
  );
  if (write) {
    await Bun.write(file, html.replace(/script-src 'self'( 'sha256-[^']*')*/, `script-src 'self' ${hashes.join(' ')}`));
    console.log(`${file}: script-src now allows ${hashes.join(' ')}`);
    continue;
  }
  const missing = hashes.filter((hash) => !policy.includes(hash));
  if (missing.length) {
    console.error(`${file}: the policy does not allow inline script ${missing.join(', ')}.`);
    failed = true;
  } else {
    console.log(`${file}: policy allows all ${hashes.length} inline script(s)`);
  }
}
if (failed) {
  console.error('Run `bun scripts/check-csp.ts --write` and rebuild.');
  process.exit(1);
}
