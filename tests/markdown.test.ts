import { expect, test } from 'bun:test';
import { titleOf } from '../src/library';
import { isMarkdown, renderMarkdown, safeHref } from '../src/markdown';

test('text is a diagram when it starts with a diagram type, and Markdown otherwise', () => {
  expect(isMarkdown('flowchart LR\n  A --> B')).toBe(false);
  expect(isMarkdown('---\ntitle: Plan\n---\nsequenceDiagram')).toBe(false);
  expect(isMarkdown('%% note\npie\n  "a": 1')).toBe(false);
  expect(isMarkdown('# Notes\n\nSome text')).toBe(true);
  expect(isMarkdown('Plain words')).toBe(true);
  expect(isMarkdown('  \n')).toBe(false);
});

test('Markdown renders', () => {
  const { html } = renderMarkdown('# Title\n\n*a* **b** `c`\n\n| x |\n| - |\n| 1 |\n\n- [x] done');
  expect(html).toContain('<h1>Title</h1>');
  expect(html).toContain('<em>a</em> <strong>b</strong> <code>c</code>');
  expect(html).toContain('<table>');
  expect(html).toContain('type="checkbox"');
});

test('raw HTML is shown as text', () => {
  const { html } = renderMarkdown('<script>alert(1)</script>\n\nHi <img src=x onerror=alert(1)> there');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;script&gt;');
});

test('only web, mail and phone links stay links', () => {
  expect(safeHref('https://example.com/a b')).toBe('https://example.com/a%20b');
  expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
  expect(safeHref('javascript:alert(1)')).toBeNull();
  expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
  expect(safeHref('data:text/html,hi')).toBeNull();
  expect(safeHref('./relative')).toBeNull();
  const { html } = renderMarkdown('[ok](https://example.com "T") [bad](javascript:alert(1)) <https://x.org>');
  expect(html).toContain('<a href="https://example.com/" title="T">ok</a>');
  expect(html).toContain('bad');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('<a href="https://x.org/">');
});

test('images are left out and counted', () => {
  const { html, images } = renderMarkdown('![a cat](https://tracker.example/c.png) ![](x.png)');
  expect(images).toBe(2);
  expect(html).not.toContain('tracker.example');
  expect(html).toContain('image: a cat');
});

test('mermaid blocks become slots that know their lines', () => {
  const source =
    '# Doc\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```js\nlet x;\n```\n\n~~~Mermaid\npie\n  "a": 1\n~~~\n';
  const { html, blocks } = renderMarkdown(source);
  expect(blocks).toEqual([
    { text: 'flowchart LR\n  A --> B', line: 4 },
    { text: 'pie\n  "a": 1', line: 13 },
  ]);
  expect(html).toContain('<div class="md-diagram" data-block="0"></div>');
  expect(html).toContain('<div class="md-diagram" data-block="1"></div>');
  expect(html).toContain('let x;');
});

test('repeated diagrams find their own lines', () => {
  const block = '```mermaid\npie\n  "a": 1\n```';
  const { blocks } = renderMarkdown(`${block}\n\ntext\n\n${block}`);
  expect(blocks.map((b) => b.line)).toEqual([2, 9]);
});

test('a document is named by its first heading', () => {
  expect(titleOf('Intro text\n\n## The *plan*\n')).toBe('Markdown · The plan');
  expect(titleOf('Just a [link](https://x.org) here')).toBe('Markdown · Just a link here');
});
