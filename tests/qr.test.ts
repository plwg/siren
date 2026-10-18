import { expect, test } from 'bun:test';
import jsQR from 'jsqr';
import { encodeDiagram } from '../src/hash';
import { qrCode } from '../src/qr';

// Reads a code back with an independent decoder, from an image of its modules.
const scan = (modules: boolean[][], scale = 4): string | null => {
  const side = modules.length * scale;
  const pixels = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const value = modules[Math.floor(y / scale)]?.[Math.floor(x / scale)] ? 0 : 255;
      pixels.set([value, value, value, 255], (y * side + x) * 4);
    }
  }
  return jsQR(pixels, side, side)?.data ?? null;
};

const link = (text: string, view = true) =>
  `https://plwg.github.io/siren/${view ? '?view' : ''}#${encodeDiagram(text)}`;

test('a share link scans back to itself', () => {
  const url = link('flowchart LR\n  A[Write Mermaid] --> B{Pele}\n  B --> C[SVG]');
  const qr = qrCode(url);
  expect(qr).not.toBeNull();
  expect(scan(qr?.modules ?? [])).toBe(url);
});

test('the code is black on white with a quiet zone', () => {
  const qr = qrCode('https://plwg.github.io/siren/');
  expect(qr?.svg).toContain('fill="#fff"');
  expect(qr?.svg).toContain('fill="#000"');
  // Four light modules on every side.
  const rows = qr?.modules ?? [];
  for (const row of [...rows.slice(0, 4), ...rows.slice(-4)]) expect(row.every((dark) => !dark)).toBe(true);
  for (const row of rows) expect([...row.slice(0, 4), ...row.slice(-4)].every((dark) => !dark)).toBe(true);
});

test('a long link still fits and scans', () => {
  // Varied labels, so compression can't shrink the link much.
  const lines = Array.from(
    { length: 60 },
    (_, i) => `  s${i}[${((i + 7) * 104_729).toString(36)} ${((i + 3) * 7_919).toString(36)}] --> s${i + 1}`,
  );
  const url = link(`flowchart TD\n${lines.join('\n')}`);
  expect(url.length).toBeGreaterThan(800);
  const qr = qrCode(url);
  expect(qr).not.toBeNull();
  expect(scan(qr?.modules ?? [])).toBe(url);
});

test('a link too long for any QR code gives null', () => {
  expect(qrCode(`https://plwg.github.io/siren/#${'x'.repeat(3500)}`)).toBeNull();
});
