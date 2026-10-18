import { describe, expect, test } from 'bun:test';
import { deflateSync } from 'fflate';
import { decodeDiagram, encodeDiagram } from '../src/hash';

const SAMPLE = `flowchart TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `;

describe('links', () => {
  test('round-trip a diagram', () => {
    expect(decodeDiagram(encodeDiagram(SAMPLE))).toBe(SAMPLE);
  });

  test('round-trip text outside ASCII', () => {
    const text = 'flowchart LR\n  A[Café ☕] --> B[日本語] --> C[аpple 🧜‍♀️]';
    expect(decodeDiagram(encodeDiagram(text))).toBe(text);
  });

  test('new links use the compressed form and only URL-safe characters', () => {
    const fragment = encodeDiagram(SAMPLE);
    expect(fragment.startsWith('d.')).toBe(true);
    expect(fragment).toMatch(/^d\.[A-Za-z0-9_-]+$/);
  });

  test('a longer diagram compresses to well under its uncompressed link', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `  N${i}[Step ${i}] --> N${i + 1}[Step ${i + 1}]`);
    const text = `flowchart TD\n${lines.join('\n')}`;
    const old = Buffer.from(text).toString('base64url');
    expect(encodeDiagram(text).length).toBeLessThan(old.length / 3);
  });

  test('older uncompressed links still open', () => {
    // The link from the earlier bug report, made before compression.
    const old =
      'Zmxvd2NoYXJ0IFRECiAgICBBW0NocmlzdG1hc10gLS0-fEdldCBtb25leXwgQihHbyBzaG9wcGluZykKICAgIEIgLS0-IEN7TGV0IG1lIHRoaW5rfQogICAgQyAtLT58T25lfCBEW0xhcHRvcF0KICAgIEMgLS0-fFR3b3wgRVtpUGhvbmVdCiAgICBDIC0tPnxUaHJlZXwgRltmYTpmYS1jYXIgQ2FyXQogIA';
    expect(decodeDiagram(old)).toBe(SAMPLE);
  });

  test('an empty diagram has its own link, unlike no diagram at all', () => {
    expect(encodeDiagram('')).toBe('d.AwA');
    expect(decodeDiagram('d.AwA')).toBe('');
  });

  test('empty and unreadable fragments give null', () => {
    expect(decodeDiagram('')).toBeNull();
    expect(decodeDiagram('d.!!!')).toBeNull();
    expect(decodeDiagram('d.AAAA')).toBeNull();
    expect(decodeDiagram('%%%')).toBeNull();
    // Valid base64 of bytes that aren't UTF-8.
    expect(decodeDiagram('_-8')).toBeNull();
  });

  test('a link that inflates past the limit is refused', () => {
    const bomb = deflateSync(new Uint8Array(50_000_000), { level: 9 });
    const fragment = `d.${Buffer.from(bomb).toString('base64url')}`;
    expect(fragment.length).toBeLessThan(100_000);
    expect(decodeDiagram(fragment)).toBeNull();
  });
});
