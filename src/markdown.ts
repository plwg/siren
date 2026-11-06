import { Marked, type Token } from 'marked';
import markedFootnote from 'marked-footnote';

// Markdown documents, which may hold ```mermaid blocks. Like diagrams, they arrive in links anyone
// can craft, so the HTML is limited to what Markdown itself makes:
//
// - Raw HTML is shown as text, not markup, except for collapsible sections: <details> (with or
//   without `open`) and <summary>, as on GitHub. Those tags are written out afresh, so no
//   attribute but `open` gets through.
// - Links work only for http, https, mailto and tel; others keep their text and lose the link.
//   The page's link check (links.ts) still asks before following one.
// - Headings get ids made the way GitHub makes them, so `[see](#the-plan)` jumps to "## The plan".
//   The ids are prefixed (md-h-) so a document can't clash with the page's own, or with its
//   footnotes'. Like footnotes, these links stay in the page (see links.ts).
// - Images aren't loaded, for the same reason as in diagrams (omitted.ts): a placeholder names
//   them instead, so a shared link can't track who views it.
// - Each ```mermaid block becomes an empty slot that the page fills with a Pele drawing.
// - Footnotes ([^1] and `[^1]: text`) follow GitHub's: numbered references, and the notes in a list
//   at the end with links back. Their links stay in the page (see links.ts).
//
// Each top-level element carries `data-line`, the source line it starts on, so the editor and the
// preview can scroll together (scrollsync.ts).

export interface Block {
  /** The diagram's Mermaid text. */
  text: string;
  /** The line of the source, counting from 1, where the diagram's text starts; null if unknown. */
  line: number | null;
}

export interface Rendered {
  html: string;
  /** The ```mermaid blocks, in order; slot `data-block="i"` is for `blocks[i]`. */
  blocks: Block[];
  /** Images left out. */
  images: number;
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The only raw HTML let through: GitHub's collapsible sections.
const SECTION_TAG = /<(\/?)(details|summary)(?=[\s/>])([^<>]*)>/gi;

/** Raw HTML as text, but with <details> and <summary> tags kept, and no attribute but `open`. */
export function sectionsOnly(html: string): string {
  let out = '';
  let last = 0;
  for (const match of html.matchAll(SECTION_TAG)) {
    const [tag, close, name = '', attributes = ''] = match;
    const element = name.toLowerCase();
    const open = !close && element === 'details' && /(^|\s)open(\s|=|\/|$)/i.test(attributes) ? ' open' : '';
    out += `${escapeHtml(html.slice(last, match.index))}<${close}${element}${open}>`;
    last = match.index + tag.length;
  }
  return out + escapeHtml(html.slice(last));
}

/** A heading's text as GitHub reads it for its id: no markup, images or raw HTML. */
function plainText(tokens: readonly Token[]): string {
  return tokens
    .map((token): string => {
      if (token.type === 'html' || token.type === 'image') return '';
      if ('tokens' in token && token.tokens) return plainText(token.tokens);
      return 'text' in token && typeof token.text === 'string' ? token.text : '';
    })
    .join('')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|\w+);/gi, (_m, ref: string) => {
      if (!ref.startsWith('#')) return '';
      const code = ref[1]?.toLowerCase() === 'x' ? Number.parseInt(ref.slice(2), 16) : Number(ref.slice(1));
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    });
}

/** GitHub's slug for a heading: lower case, punctuation dropped, spaces as hyphens. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replace(/ /g, '-');
}

const HEADING_PREFIX = 'md-h-';

/** The id a link to `#fragment` points at, or null for a bare #. */
function headingTarget(fragment: string): string | null {
  let decoded = fragment;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {}
  return decoded ? HEADING_PREFIX + decoded.toLowerCase() : null;
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** The link, if it is one Siren will follow. Relative links have nowhere to go from Siren. */
export function safeHref(href: string): string | null {
  try {
    const url = new URL(href);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const isMermaid = (lang: string | undefined): boolean => /^mermaid\b/i.test((lang ?? '').trim());

/** The line where text starting at `index` of `source` is. */
const lineAt = (source: string, index: number): number => source.slice(0, index).split('\n').length;

/** The document's name: its first heading, or else its first line, without inline markup. */
export function documentTitle(text: string): string {
  const lines = text.split('\n').map((l) => l.trim());
  const heading = lines.find((l) => /^#{1,6}\s/.test(l))?.replace(/^#+\s+|\s+#+$/g, '');
  const first = heading ?? lines.find((l) => l && l !== '---' && !l.startsWith('```')) ?? '';
  return first.replace(/[*_`~]+|^[>\-+]\s+|\[([^\]]*)\]\([^)]*\)/g, (_m, link) => link ?? '').trim();
}

/** The document as HTML, with an empty slot for each Mermaid block. */
export function renderMarkdown(source: string): Rendered {
  const blocks: Block[] = [];
  let images = 0;
  // Where to look for the next block's text, so repeated diagrams find their own lines.
  let from = 0;
  // Slugs used so far, and how many times: a repeated heading gets -1, -2 and so on, as on GitHub.
  const slugs = new Map<string, number>();
  const uniqueSlug = (base: string): string => {
    let result = base;
    while (slugs.has(result)) {
      const count = (slugs.get(base) ?? 0) + 1;
      slugs.set(base, count);
      result = `${base}-${count}`;
    }
    slugs.set(result, 0);
    return result;
  };

  const marked = new Marked(
    // Footnote ids are prefixed so they can't clash with the page's own. The back links' label is
    // fixed: the extension would put the footnote's label in it unescaped.
    markedFootnote({ prefixId: 'md-fn-', headingClass: 'sr', backRefLabel: 'Back to the text' }),
  );
  marked.use({
    gfm: true,
    async: false,
    renderer: {
      html: ({ text }) => sectionsOnly(text),
      heading({ tokens, depth }) {
        const base = slug(plainText(tokens));
        const id = base ? ` id="${escapeHtml(HEADING_PREFIX + uniqueSlug(base))}"` : '';
        return `<h${depth}${id}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titled = title ? ` title="${escapeHtml(title)}"` : '';
        if (href.startsWith('#')) {
          const target = headingTarget(href.slice(1));
          return target ? `<a href="#${escapeHtml(target)}"${titled}>${text}</a>` : text;
        }
        const safe = safeHref(href);
        if (!safe) return text;
        return `<a href="${escapeHtml(safe)}"${titled}>${text}</a>`;
      },
      image({ text }) {
        images++;
        const alt = text.trim();
        return `<span class="md-omitted" title="Image not shown">${alt ? `image: ${escapeHtml(alt)}` : 'image'}</span>`;
      },
      code({ text, lang, raw }) {
        if (!isMermaid(lang)) return false;
        // The diagram's text starts on the line after the opening fence.
        const at = source.indexOf(raw.trimStart(), from);
        let line: number | null = null;
        if (at !== -1) {
          from = at + raw.length;
          line = lineAt(source, at) + 1;
        }
        blocks.push({ text, line });
        return `<div class="md-diagram" data-block="${blocks.length - 1}"></div>\n`;
      },
    },
  });

  // Top-level tokens, one per heading, paragraph, list and so on, add up to the whole source, so
  // counting their lines says where each starts. Each is drawn on its own to tag its element.
  // Reference links are resolved while lexing, so drawing a token alone loses nothing.
  //
  // The footnote extension puts its list of notes first among the tokens, with no text of its
  // own, and moves it to the end only in marked.parse(); here it is drawn last, at the line of
  // the first note.
  let line = 1;
  let html = '';
  let footnotes: Token | undefined;
  let notesLine: number | undefined;
  for (const token of marked.lexer(source)) {
    if (token.type === 'footnotes') {
      footnotes = token;
      continue;
    }
    const start = line + (token.raw.match(/^\n*/)?.[0].length ?? 0);
    line += token.raw.split('\n').length - 1;
    if (token.type === 'footnote') notesLine ??= start;
    html += marked.parser([token]).replace(/^<([a-z][a-z0-9]*)/, `<$1 data-line="${start}"`);
  }
  if (footnotes) {
    const notes = marked.parser([footnotes]);
    html += notesLine === undefined ? notes : notes.replace(/^<section/, `<section data-line="${notesLine}"`);
  }
  return { html, blocks, images };
}
