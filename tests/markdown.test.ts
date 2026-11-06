import { expect, test } from 'bun:test';
import { titleOf } from '../src/library';
import { documentTitle, renderMarkdown, safeHref, sectionsOnly, slug } from '../src/markdown';

test('Markdown renders', () => {
  const { html } = renderMarkdown('# Title\n\n*a* **b** `c`\n\n| x |\n| - |\n| 1 |\n\n- [x] done');
  expect(html).toContain('<h1 data-line="1" id="md-h-title">Title</h1>');
  expect(html).toContain('<em>a</em> <strong>b</strong> <code>c</code>');
  expect(html).toContain('<table data-line="5">');
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
  expect(html).toContain('<div data-line="3" class="md-diagram" data-block="0"></div>');
  expect(html).toContain('<div data-line="12" class="md-diagram" data-block="1"></div>');
  expect(html).toContain('let x;');
});

test('repeated diagrams find their own lines', () => {
  const block = '```mermaid\npie\n  "a": 1\n```';
  const { blocks } = renderMarkdown(`${block}\n\ntext\n\n${block}`);
  expect(blocks.map((b) => b.line)).toEqual([2, 9]);
});

test('a document is named by its first heading, or else its first line', () => {
  expect(documentTitle('Intro text\n\n## The *plan*\n')).toBe('The plan');
  expect(documentTitle('Just a [link](https://x.org) here')).toBe('Just a link here');
  expect(titleOf('flowchart LR\n', 'markdown')).toBe('flowchart LR');
  expect(titleOf('  \n', 'markdown')).toBe('Untitled document');
});

test('text that looks like a diagram is still a document in Markdown mode', () => {
  const { html, blocks } = renderMarkdown('flowchart LR\n  A --> B');
  expect(blocks).toEqual([]);
  expect(html).toContain('<p data-line="1">flowchart LR');
});

test('footnotes are numbered, listed at the end, and linked both ways', () => {
  const { html } = renderMarkdown(
    'One.[^a] Two.[^b] One again.[^a]\n\n[^a]: First **note**.\n[^b]: Second.\n\n## After\n',
  );
  expect(html).toContain('<a id="md-fn-ref-a" href="#md-fn-a"');
  expect(html).toContain('<a id="md-fn-ref-a-2" href="#md-fn-a"');
  expect(html).toContain('<li id="md-fn-a">');
  expect(html).toContain('First <strong>note</strong>.');
  expect(html).toContain('href="#md-fn-ref-a-2"');
  // The notes come after everything else, tagged with the line of the first note for scroll sync.
  expect(html.indexOf('<h2 data-line="6" id="md-h-after">After</h2>')).toBeLessThan(
    html.indexOf('<section data-line="3"'),
  );
});

test('footnotes stay as safe as the rest of the document', () => {
  const evil = '[^x" onmouseover="alert(1)]';
  const { html } = renderMarkdown(`Ref${evil}\n\n${evil}: <img src=x> [l](javascript:alert(1))\n`);
  expect(html).not.toContain('" onmouseover');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('javascript:');
});

test('a reference with no note stays as text', () => {
  expect(renderMarkdown('See [^none].').html).toContain('See [^none].');
});

test('headings get GitHub ids, and links to them stay in the page', () => {
  expect(slug('The *plan*: 2026 & beyond!')).toBe('the-plan-2026--beyond');
  expect(slug('Café_au lait 🎉')).toBe('café_au-lait-');
  const { html } = renderMarkdown(
    '# The `big` plan &amp; more\n\n## Notes\n\n## Notes\n\nNotes-1\n---\n\n[go](#The-big-plan--more "T") [two](#notes-1) [top](#) [é](#caf%C3%A9)',
  );
  expect(html).toContain('<h1 data-line="1" id="md-h-the-big-plan--more">');
  expect(html).toContain('id="md-h-notes">');
  expect(html).toContain('id="md-h-notes-1">');
  // A heading whose own slug was taken by a repeat moves on, as on GitHub.
  expect(html).toContain('id="md-h-notes-1-1">');
  expect(html).toContain('<a href="#md-h-the-big-plan--more" title="T">go</a>');
  expect(html).toContain('<a href="#md-h-notes-1">two</a>');
  expect(html).toContain(' top ');
  expect(html).toContain('<a href="#md-h-café">é</a>');
});

test('heading ids and in-page links stay safe', () => {
  const { html } = renderMarkdown('# a" onclick="x\n\n[l](#a"onclick="x) [m](<#"><img src=x>>)');
  expect(html).not.toContain('" onclick');
  expect(html).not.toContain('"onclick');
  expect(html).not.toContain('<img');
});

test('collapsible sections are kept, and nothing else of raw HTML', () => {
  expect(sectionsOnly('<DETAILS open class="x" onclick="y"><summary style="z">Hi <b>x</b></summary>')).toBe(
    '<details open><summary>Hi &lt;b&gt;x&lt;/b&gt;</summary>',
  );
  expect(sectionsOnly('<details data-open="1">')).toBe('<details>');
  expect(sectionsOnly('<detailsx> <details-x> </details >')).toBe('&lt;detailsx&gt; &lt;details-x&gt; </details>');
  const { html } = renderMarkdown('<details>\n<summary>More</summary>\n\nBody **text**\n\n</details>\n');
  expect(html).toContain('<details data-line="1">\n<summary>More</summary>');
  expect(html).toContain('<p data-line="4">Body <strong>text</strong></p>');
  expect(html).toContain('</details>');
});
