import { expect, test } from 'bun:test';
import { DEFAULT_EXPORT, exportSvg } from '../src/export';

const SOURCE =
  'flowchart LR\n  A[Start] -->|go| B@{ img: "https://example.org/x.png", label: "Pic" }\n  click A href "https://example.org"';

test('exports bake in colors and fonts, and carry no links or remote images', async () => {
  const { svg, width, height } = exportSvg(SOURCE, DEFAULT_EXPORT);
  expect(svg).not.toMatch(/var\(--pele-(?!series)/);
  expect(svg).toContain('#0a6c73');
  expect(svg).toContain('Arial');
  expect(svg).not.toMatch(/<a[\s>]/);
  expect(svg).not.toContain('<image');
  expect(svg).not.toContain('example.org');
  expect(svg).toContain(`width="${width}"`);
  expect(height).toBeGreaterThan(0);
  expect(svg).not.toContain('<rect width="100%"');
});

test('neutral, dark and solid change the colors and add a background', async () => {
  const { svg } = exportSvg(SOURCE, { palette: 'neutral', mode: 'dark', background: 'solid' });
  expect(svg).toContain('#8ab4f8');
  expect(svg).toContain('<rect width="100%" height="100%" fill="#1e1e1e"/>');
});
