// Checks that the Content Security Policy in the built page allows each inline script by hash.
// Editing the inline theme script in index.html changes its hash; this fails the build until the
// policy is updated, rather than letting the deployed page block its own script.
//
//   bun scripts/check-csp.ts            check dist/index.html
//   bun scripts/check-csp.ts --write    update the hash in index.html

import { createHash } from 'node:crypto';

const write = process.argv.includes('--write');
const file = write ? 'index.html' : 'dist/index.html';
const html = await Bun.file(file).text();

const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
if (!policy) {
  console.error(`${file}: no Content-Security-Policy meta tag`);
  process.exit(1);
}

const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  ([, body]) => `'sha256-${createHash('sha256').update(body ?? '').digest('base64')}'`,
);

if (write) {
  const updated = html.replace(/script-src 'self'( 'sha256-[^']*')*/, `script-src 'self' ${hashes.join(' ')}`);
  await Bun.write(file, updated);
  console.log(`${file}: script-src now allows ${hashes.join(' ')}`);
} else {
  const missing = hashes.filter((hash) => !policy.includes(hash));
  if (missing.length) {
    console.error(`${file}: the policy does not allow inline script ${missing.join(', ')}.`);
    console.error('Run `bun scripts/check-csp.ts --write` and rebuild.');
    process.exit(1);
  }
  console.log(`${file}: policy allows all ${hashes.length} inline script(s)`);
}
