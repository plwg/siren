import { deflateSync, Inflate, strFromU8, strToU8 } from 'fflate';

// The diagram lives in the URL after `#`, so a link carries it anywhere and no server sees it.
// Links are `#d.` and the deflated UTF-8 text in base64url, a few times shorter than the text.
// Older links hold the text uncompressed, with no prefix. `.` is not a base64url character, so
// the two can't be confused.

const PREFIX = 'd.';

// A crafted link could inflate to gigabytes. Pele refuses text over 50,000 characters anyway, so
// stop well past that instead of exhausting memory.
const MAX_BYTES = 200_000;
const STEP = 1024;

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const inflateLimited = (data: Uint8Array): Uint8Array => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const inflate = new Inflate((chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error('The diagram in this link is too large.');
    chunks.push(chunk);
  });
  // Small steps, so that no single step can expand past the limit by much.
  for (let i = 0; i < data.length; i += STEP) inflate.push(data.subarray(i, i + STEP), i + STEP >= data.length);
  if (data.length === 0) inflate.push(data, true);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

/** The URL fragment, without `#`, that carries this diagram. */
export function encodeDiagram(text: string): string {
  return PREFIX + toBase64Url(deflateSync(strToU8(text), { level: 9 }));
}

/** The diagram in a URL fragment (without `#`), or null if it holds none that can be read. */
export function decodeDiagram(fragment: string): string | null {
  if (!fragment) return null;
  try {
    if (fragment.startsWith(PREFIX)) return strFromU8(inflateLimited(fromBase64Url(fragment.slice(PREFIX.length))));
    return new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(fragment));
  } catch {
    return null;
  }
}
