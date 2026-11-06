import { type Mounted, type MountOptions, mount } from 'pele/lazy';
import { type Block, renderMarkdown } from './markdown';
import { IconTracker, type Omitted, omitForPage } from './omitted';
import { initToc } from './toc';

// Draws a Markdown document into the page, with a Pele drawing for each ```mermaid block. Text is
// drawn again on every edit, but a diagram whose text didn't change keeps its drawing: moving the
// element is far cheaper than laying it out again, so typing prose next to big diagrams stays fast.

export interface DocumentProblem {
  /** Which diagram, counting from 1. */
  index: number;
  error: unknown;
  /** The line of the source where the diagram's text starts, or null. */
  line: number | null;
}

export interface DocumentReport {
  /** The first diagram that failed to draw, or null. */
  problem: DocumentProblem | null;
  /** Images and icons left out, across the document and its diagrams. */
  omitted: Omitted;
}

export interface DocumentView {
  update(text: string): void;
  /** Draws the diagrams again, as after the fonts load. */
  refresh(): void;
  /** Stops drawing; the caller clears the container. */
  destroy(): void;
}

interface Slot {
  element: HTMLElement;
  mounted: Mounted;
  text: string;
  line: number | null;
  error: unknown;
  omitted: Omitted;
}

export function initDocument(container: HTMLElement, onReport: (report: DocumentReport) => void): DocumentView {
  const article = document.createElement('article');
  article.className = 'doc';
  const toc = initToc(container, article);
  container.replaceChildren(toc.element, article);

  let slots: Slot[] = [];
  let images = 0;
  // Whether each collapsible section was open as written, when last drawn. A section the reader
  // opened or closed stays that way while they type, matched by its place in the document.
  let written: boolean[] = [];

  const report = (): void => {
    const failed = slots.findIndex((s) => s.error !== undefined);
    const slot = slots[failed];
    const icons = slots.flatMap((s) => s.omitted.icons);
    onReport({
      problem: slot ? { index: failed + 1, error: slot.error, line: slot.line } : null,
      omitted: { images: images + slots.reduce((n, s) => n + s.omitted.images, 0), icons },
    });
  };
  // Pele calls back while drawing, before the new slots are all in place; report once after.
  let drawing = false;
  const changed = (): void => {
    if (!drawing) report();
  };

  const create = (element: HTMLElement, block: Block): Slot => {
    const icons = new IconTracker();
    // Pele calls back while mounting, before `mounted` is set.
    const slot = {
      element,
      text: block.text,
      line: block.line,
      error: undefined,
      omitted: { images: 0, icons: [] },
    } as unknown as Slot;
    const options: MountOptions = {
      // The document scrolls; zooming one diagram inside it would fight the scrolling.
      zoom: false,
      icons: icons.resolve,
      sanitize: (svg) => {
        const result = omitForPage(svg, icons.take());
        slot.omitted = result.omitted;
        return result.node;
      },
      onRender: () => {
        slot.error = undefined;
        changed();
      },
      onError: (e) => {
        slot.error = e;
        changed();
      },
    };
    slot.mounted = mount(element, block.text, options);
    return slot;
  };

  return {
    update(text) {
      const rendered = renderMarkdown(text);
      images = rendered.images;
      const template = document.createElement('template');
      // The markup comes from markdown.ts, which escapes raw HTML and filters links.
      template.innerHTML = rendered.html;

      // Diagrams that are still in the document keep their drawings.
      const spare = new Map<string, Slot[]>();
      for (const slot of slots) spare.set(slot.text, [...(spare.get(slot.text) ?? []), slot]);
      const next: (Slot | { placeholder: HTMLElement; block: Block })[] = [];
      for (const placeholder of template.content.querySelectorAll<HTMLElement>('.md-diagram')) {
        const block = rendered.blocks[Number(placeholder.dataset.block)];
        if (!block) continue;
        const kept = spare.get(block.text)?.shift();
        if (kept) {
          kept.line = block.line;
          placeholder.replaceWith(kept.element);
          next.push(kept);
        } else next.push({ placeholder, block });
      }
      for (const unused of spare.values()) for (const slot of unused) slot.mounted.destroy();

      const sections = template.content.querySelectorAll('details');
      const before = article.querySelectorAll('details');
      const now = [...sections].map((d) => d.open);
      sections.forEach((section, i) => {
        const old = before[i];
        if (old && old.open !== written[i]) section.open = old.open;
      });
      written = now;

      article.replaceChildren(template.content);
      // New diagrams are drawn once in the page, where Pele can measure them.
      drawing = true;
      try {
        slots = next.map((item) => ('mounted' in item ? item : create(item.placeholder, item.block)));
      } finally {
        drawing = false;
      }
      toc.update();
      report();
    },
    refresh() {
      for (const slot of slots) slot.mounted.refresh();
    },
    destroy() {
      toc.destroy();
      for (const slot of slots) slot.mounted.destroy();
      slots = [];
    },
  };
}
