// A light Mermaid highlighter for the editor's backdrop. It colors what helps reading (the diagram
// type, keywords, arrows, quoted text and edge labels, comments) without parsing: unusual syntax
// is left plain rather than colored wrongly. Output is one block per line, for line numbers.

const KEYWORDS = [
  // Shared and flowchart
  'subgraph',
  'end',
  'click',
  'href',
  'call',
  'callback',
  'style',
  'classDef',
  'class',
  'linkStyle',
  'direction',
  'TB',
  'TD',
  'BT',
  'RL',
  'LR',
  'accTitle',
  'accDescr',
  'title',
  // Sequence
  'participant',
  'actor',
  'as',
  'note',
  'Note',
  'over',
  'left of',
  'right of',
  'loop',
  'alt',
  'else',
  'opt',
  'par',
  'and',
  'critical',
  'break',
  'rect',
  'activate',
  'deactivate',
  'autonumber',
  'box',
  // Gantt, timeline, state, git
  'section',
  'dateFormat',
  'axisFormat',
  'excludes',
  'todayMarker',
  'state',
  'commit',
  'branch',
  'checkout',
  'merge',
];

const TOKENS = new RegExp(
  [
    '(?<comment>%%.*$)',
    '(?<string>"(?:[^"\\\\]|\\\\.)*"?)',
    '(?<label>\\|[^|\\n]*\\|)',
    '(?<arrow><?(?:-{2,}|={2,}|~{3,}|-\\.+-?|\\.-+)[->xo)]*>?|-+>>?|<<-+)',
    `(?<keyword>\\b(?:${KEYWORDS.map((k) => k.replace(' ', '\\s+')).join('|')})\\b)`,
    '(?<punct>[[\\](){}@:;,])',
  ].join('|'),
  'g',
);

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (kind: string, text: string): string => `<span class="tok-${kind}">${escapeHtml(text)}</span>`;

function highlightLine(line: string): string {
  let out = '';
  let last = 0;
  for (const match of line.matchAll(TOKENS)) {
    const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0];
    if (!kind || match[0] === '') continue;
    out += escapeHtml(line.slice(last, match.index)) + span(kind, match[0]);
    last = match.index + match[0].length;
  }
  return out + escapeHtml(line.slice(last));
}

/** The text as highlighted HTML, one `<span class="line">` per line. `errorLine` counts from 1. */
export function highlight(text: string, errorLine: number | null = null): string {
  const lines = text.split('\n');
  // The diagram type is the first word of the first line that isn't blank, a comment or front matter.
  let typeLine = -1;
  let inFrontMatter = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? '').trim();
    if (trimmed === '---') {
      inFrontMatter = !inFrontMatter;
      continue;
    }
    if (inFrontMatter || trimmed === '' || trimmed.startsWith('%%')) continue;
    typeLine = i;
    break;
  }
  return lines
    .map((line, i) => {
      let body: string;
      const type = i === typeLine ? line.match(/^(\s*)([\w-]+)(.*)$/) : null;
      if (type) body = escapeHtml(type[1] ?? '') + span('type', type[2] ?? '') + highlightLine(type[3] ?? '');
      else body = highlightLine(line);
      // An empty line still needs height; a space keeps it without changing how text wraps.
      const cls = i + 1 === errorLine ? 'line error' : 'line';
      return `<span class="${cls}">${body || ' '}</span>`;
    })
    .join('');
}
