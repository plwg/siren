import { Marked } from 'marked';

// Markdown documents, which may hold ```mermaid blocks. Like diagrams, they arrive in links anyone
// can craft, so the HTML is limited to what Markdown itself makes:
//
// - Raw HTML is shown as text, not markup.
// - Links work only for http, https, mailto and tel; others keep their text and lose the link.
//   The page's link check (links.ts) still asks before following one.
// - Images aren't loaded, for the same reason as in diagrams (omitted.ts): a placeholder names
//   them instead, so a shared link can't track who views it.
// - Each ```mermaid block becomes an empty slot that the page fills with a Pele drawing.

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

  const marked = new Marked({
    gfm: true,
    async: false,
    renderer: {
      html: ({ text }) => escapeHtml(text),
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const safe = safeHref(href);
        if (!safe) return text;
        const titled = title ? ` title="${escapeHtml(title)}"` : '';
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

  const html = marked.parse(source) as string;
  return { html, blocks, images };
}
