import { expect, test } from 'bun:test';
import { highlighter, loadHighlighter } from '../src/highlight';
import { renderMarkdown } from '../src/markdown';

const doc = '```ts\nconst a: number = 1; // one\n```\n\n```nope\nx < y\n```\n\n```\nplain\n```\n';

test('code shows plain until the highlighter arrives, and says it wants one', () => {
  expect(highlighter()).toBeNull();
  const { html, code } = renderMarkdown(doc);
  expect(code).toBe(true);
  expect(html).toContain('<code class="language-ts">const a: number = 1; // one');
  expect(renderMarkdown('```\nplain\n```\n\n```mermaid\npie\n```').code).toBe(false);
});

test('code that names a bundled language is highlighted', async () => {
  expect(await loadHighlighter()).toBe(true);
  const { html } = renderMarkdown(doc);
  expect(html).toContain('<pre data-line="1"><code class="hljs language-ts"><span class="hljs-keyword">const</span>');
  expect(html).toContain('<span class="hljs-comment">// one</span>');
  // Unknown and unnamed languages stay plain, as before.
  expect(html).toContain('<code class="language-nope">x &lt; y');
  expect(html).toContain('<code>plain');
});

test('every added language and its aliases are bundled', async () => {
  await loadHighlighter();
  const highlight = highlighter();
  for (const language of [
    'c',
    'h',
    'markdown',
    'md',
    'dockerfile',
    'docker',
    'toml',
    'ini',
    'sh',
    'html',
    'yml',
    'py',
    'golang',
    'rs',
    'java',
    'sql',
    'css',
    'json',
    'tsx',
    'js',
  ])
    expect(highlight?.('x', language)).not.toBeNull();
  expect(highlight?.('x', 'ruby')).toBeNull();
});

test('highlighted code stays text', async () => {
  await loadHighlighter();
  const { html } = renderMarkdown(
    '```html\n<script>alert(1)</script><img src=x onerror=alert(1)>\n```\n\n```"><img src=x>\nx\n```',
  );
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img');
});
