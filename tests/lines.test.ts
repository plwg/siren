import { expect, test } from 'bun:test';
import { numberedLines } from '../src/lines';

test('one block per line, with empty lines kept', () => {
  const html = numberedLines('flowchart LR\n\n  A --> B\n');
  expect(html.match(/<span class="line">/g)?.length).toBe(4);
  expect(html).toContain('<span class="line"> </span>');
  expect(numberedLines('')).toBe('<span class="line"> </span>');
});

test('HTML in the text is escaped', () => {
  const html = numberedLines('flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B[<b>]');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('<b>');
  expect(html).toContain('&lt;img');
});

test('the error line is marked', () => {
  const html = numberedLines('flowchart LR\n  A -->\n  B', 2);
  expect(html.match(/<span class="line error">/g)?.length).toBe(1);
  expect(html).toContain('<span class="line error">  A --&gt;</span>');
});

test('the text is unchanged apart from markup', () => {
  const text = 'flowchart LR\n  A[x & y] -->|a < b| B\n  %% end';
  const plain = numberedLines(text)
    .replace(/<span class="line(?: error)?">/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  expect(plain.slice(1)).toBe(text);
});
