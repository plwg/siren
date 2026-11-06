import { expect, test } from 'bun:test';
import { renderMarkdown } from '../src/markdown';
import { interpolate, pairs } from '../src/scrollsync';
import { TEMPLATES } from '../src/templates';

test('each top-level block is tagged with the line it starts on', () => {
  const source = '# Title\n\nIntro\nmore\n\n\n- a\n- b\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n> quote';
  const { html } = renderMarkdown(source);
  const lines = [...html.matchAll(/<(\w+) data-line="(\d+)"/g)].map((m) => `${m[1]}:${m[2]}`);
  expect(lines).toEqual(['h1:1', 'p:3', 'ul:7', 'div:10', 'blockquote:15']);
});

test('reference links still resolve when blocks are drawn one at a time', () => {
  const { html } = renderMarkdown('See [the site][s].\n\n[s]: https://example.com');
  expect(html).toContain('<a href="https://example.com/">the site</a>');
});

test("every Markdown example's blocks are tagged with lines that start them", () => {
  for (const { text, mode } of TEMPLATES) {
    if (mode !== 'markdown') continue;
    const lines = text.split('\n');
    for (const [, tag, n] of renderMarkdown(text).html.matchAll(/<(\w+) data-line="(\d+)"/g)) {
      const line = lines[Number(n) - 1] ?? '';
      // A block starts on a line with text; a heading's line starts with #.
      expect(line.trim()).not.toBe('');
      if (/^h\d$/.test(tag ?? '')) expect(line).toMatch(/^#/);
    }
  }
});

test('interpolate follows the line between points and stays flat past the ends', () => {
  const points = [
    [0, 0],
    [100, 400],
    [200, 500],
  ] as const;
  expect(interpolate(points, 50)).toBe(200);
  expect(interpolate(points, 150)).toBe(450);
  expect(interpolate(points, -10)).toBe(0);
  expect(interpolate(points, 999)).toBe(500);
});

test('pairs keep anchors in order and within reach, and end both panes together', () => {
  const anchors = [
    [10, 20],
    [5, 30], // behind the one before in the first pane
    [50, 40],
    [60, 900], // past the second pane's end
    [70, 80],
  ] as const;
  expect(pairs(anchors, 100, 300)).toEqual([
    [0, 0],
    [10, 20],
    [50, 40],
    [70, 80],
    [100, 300],
  ]);
});
