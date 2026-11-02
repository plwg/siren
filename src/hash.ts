import { deflateSync, Inflate, strFromU8, strToU8 } from 'fflate';
import type { EditorMode } from './mode';

// The diagram lives in the URL after `#`, so a link carries it anywhere and no server sees it.
// Links are a prefix and the deflated UTF-8 text in base64url: `#d.` for a Mermaid diagram, `#m.`
// for a Markdown document. Older links hold a diagram uncompressed, with no prefix. `.` is not a
// base64url character, so the forms can't be confused.

const PREFIXES: Record<EditorMode, string> = { mermaid: 'd.', markdown: 'm.' };

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

/** The URL fragment, without `#`, that carries this text. */
export function encodeDiagram(text: string, mode: EditorMode = 'mermaid'): string {
  return PREFIXES[mode] + toBase64Url(deflateSync(strToU8(text), { level: 9 }));
}

/** The text in a URL fragment (without `#`) and its mode, or null if it holds none that can be read. */
export function decodeLink(fragment: string): { text: string; mode: EditorMode } | null {
  if (!fragment) return null;
  try {
    for (const [mode, prefix] of Object.entries(PREFIXES) as [EditorMode, string][]) {
      if (fragment.startsWith(prefix)) {
        return { text: strFromU8(inflateLimited(fromBase64Url(fragment.slice(prefix.length)))), mode };
      }
    }
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(fragment)), mode: 'mermaid' };
  } catch {
    return null;
  }
}

/** The text in a URL fragment (without `#`), whichever its mode, or null. */
export const decodeDiagram = (fragment: string): string | null => decodeLink(fragment)?.text ?? null;
