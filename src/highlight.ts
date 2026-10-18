// A light Mermaid highlighter for the editor's backdrop. It colors what helps reading (the diagram
// type, keywords, arrows, quoted text and edge labels, comments) without parsing: unusual syntax
// is left plain rather than colored wrongly. Output is one block per line, for line numbers.

// Keywords that begin a statement, colored only at the start of a line, so that words like "and"
// or "end" inside a label stay plain.
const STATEMENTS = [
  'subgraph',
  'end',
  'click',
  'style',
  'classDef',
  'class',
  'linkStyle',
  'direction',
  'accTitle',
  'accDescr',
  'title',
  'participant',
  'actor',
  'note',
  'Note',
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

// Words that are keywords only after a particular statement, each with the context it needs, so
// "over" or "LR" inside a label stays plain.
const MODIFIERS = [
  // click A href "…", click A call fn()
  '(?<=^\\s*click\\s+\\S+\\s+)(?:href|call|callback)',
  // Note over A, Note left of A
  '(?<=^\\s*[Nn]ote\\s+)(?:over|left\\s+of|right\\s+of)',
  // flowchart LR, graph TD, direction RL
  '(?<=(?:flowchart|graph|direction)\\s+)(?:TB|TD|BT|RL|LR)',
];

const words = (list: string[]): string => list.map((k) => k.replace(' ', '\\s+')).join('|');

const TOKENS = new RegExp(
  [
    '(?<comment>%%.*$)',
    '(?<string>"(?:[^"\\\\]|\\\\.)*"?)',
    '(?<label>\\|[^|\\n]*\\|)',
    '(?<arrow><?(?:-{2,}|={2,}|~{3,}|-\\.+-?|\\.-+)[->xo)]*>?|-+>>?|<<-+)',
    `(?<statement>(?<=^\\s*)(?:${words(STATEMENTS)})\\b)`,
    `(?<keyword>(?:${MODIFIERS.join('|')})\\b)`,
    '(?<punct>[[\\](){}@:;,])',
  ].join('|'),
  'g',
);

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A statement keyword is a keyword that happened to start its line.
const span = (kind: string, text: string): string =>
  `<span class="tok-${kind === 'statement' ? 'keyword' : kind}">${escapeHtml(text)}</span>`;

// Highlights a line from `from` on. Matching still sees the whole line, so keywords that depend
// on what comes before them (like "LR" after "flowchart") are found.
function highlightLine(line: string, from = 0): string {
  let out = '';
  let last = from;
  for (const match of line.matchAll(TOKENS)) {
    const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0];
    if (!kind || match[0] === '' || match.index < from) continue;
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
      if (type) {
        const indent = type[1] ?? '';
        const word = type[2] ?? '';
        body = escapeHtml(indent) + span('type', word) + highlightLine(line, indent.length + word.length);
      } else body = highlightLine(line);
      // An empty line still needs height; a space keeps it without changing how text wraps.
      const cls = i + 1 === errorLine ? 'line error' : 'line';
      return `<span class="${cls}">${body || ' '}</span>`;
    })
    .join('');
}
