import { describe, expect, test } from 'bun:test';
import { highlight } from '../src/highlight';

const unescapeHtml = (text: string): string => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tokens = (html: string, kind: string): string[] =>
  [...html.matchAll(new RegExp(`<span class="tok-${kind}">(.*?)</span>`, 'g'))].map((m) => unescapeHtml(m[1] ?? ''));

describe('highlight', () => {
  test('one line block per line, with empty lines kept', () => {
    const html = highlight('flowchart LR\n\n  A --> B\n');
    expect(html.match(/<span class="line">/g)?.length).toBe(4);
    expect(html).toContain('<span class="line"> </span>');
  });

  test('the diagram type, after comments and front matter', () => {
    const html = highlight('---\ntitle: Plan\n---\n%% a note\nsequenceDiagram\n  Alice->>Bob: Hi');
    expect(tokens(html, 'type')).toEqual(['sequenceDiagram']);
    expect(tokens(html, 'comment')).toEqual(['%% a note']);
  });

  test('arrows, edge labels, strings and keywords', () => {
    const html = highlight('flowchart LR\n  A -->|yes| B["Quoted"]\n  B -.-> C ==> D\n  click A href "https://x.org"');
    expect(tokens(html, 'arrow')).toEqual(['-->', '-.->', '==>']);
    expect(tokens(html, 'label')).toEqual(['|yes|']);
    expect(tokens(html, 'string')).toEqual(['"Quoted"', '"https://x.org"']);
    expect(tokens(html, 'keyword')).toEqual(expect.arrayContaining(['LR', 'click', 'href']));
  });

  test('keywords inside labels stay plain', () => {
    const flow = highlight('flowchart TD\n  fix[Fix and push again] --> done[The end]');
    expect(tokens(flow, 'keyword')).toEqual(['TD']);
    const seq = highlight('sequenceDiagram\n  par Alice to Bob\n    A->>B: loop and end\n  and Alice to Carol\n  end');
    expect(tokens(seq, 'keyword')).toEqual(['par', 'and', 'end']);
  });

  test('mid-line keywords need their statement', () => {
    expect(tokens(highlight('flowchart TD\n  C[Whisk sugar over heat, LR style] --> D'), 'keyword')).toEqual(['TD']);
    const seq = highlight('sequenceDiagram\n  Note over A,B: hover over\n  note left of A: x');
    expect(tokens(seq, 'keyword')).toEqual(['Note', 'over', 'note', 'left of']);
    expect(tokens(highlight('flowchart LR\n  click A href "x"\n  A[href]'), 'keyword')).toEqual([
      'LR',
      'click',
      'href',
    ]);
    expect(tokens(highlight('flowchart LR\n  subgraph S\n    direction TB\n  end'), 'keyword')).toEqual([
      'LR',
      'subgraph',
      'direction',
      'TB',
      'end',
    ]);
  });

  test('sequence arrows', () => {
    expect(tokens(highlight('sequenceDiagram\n  A->>B: hi\n  B-->>A: ok'), 'arrow')).toEqual(['->>', '-->>']);
  });

  test('hyphenated words are not arrows', () => {
    expect(tokens(highlight('flowchart LR\n  co-exist[well-known] --> B'), 'arrow')).toEqual(['-->']);
  });

  test('HTML in the text is escaped', () => {
    const html = highlight('flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B[<b>]');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img');
  });

  test('the error line is marked', () => {
    const html = highlight('flowchart LR\n  A -->\n  B', 2);
    expect(html.match(/<span class="line error">/g)?.length).toBe(1);
    expect(html.indexOf('line error')).toBeGreaterThan(html.indexOf('flowchart'));
  });

  test('text is unchanged apart from markup', () => {
    const text = 'flowchart LR\n  A[x & y] -->|a < b| B\n  %% end';
    const plain = highlight(text)
      .replace(/<span class="line(?: error)?">/g, '\n')
      .replace(/<[^>]+>/g, '');
    expect(unescapeHtml(plain).slice(1)).toBe(text);
  });

  test('placeholder for empty lines is the only addition', () => {
    expect(highlight('')).toBe('<span class="line"> </span>');
  });
});
