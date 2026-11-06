// A table of contents for a Markdown document: a small button at the top right of the preview
// that opens a list of the document's headings. Pointing at it opens the list and moving away
// closes it; clicking keeps it open, which is how it works on touch screens, and Enter does the
// same from the keyboard. Choosing a heading
// scrolls the preview to it. Like footnote links (links.ts), it never touches the address,
// which holds the document.

import { drawn, reveal } from './links';

export interface Heading {
  level: number;
  text: string;
}

/** The headings worth listing, with levels counted from the shallowest one present. */
export function outline(headings: readonly Heading[]): Heading[] {
  const listed = headings.filter((h) => h.text.trim() !== '');
  const top = Math.min(...listed.map((h) => h.level));
  return listed.map((h) => ({ level: h.level - top, text: h.text.trim() }));
}

// A document with fewer headings than this needs no contents.
const MIN_HEADINGS = 2;

// An outline (bullets, the lower two indented) rather than plain lines, which would read as the
// page's ☰ menu.
const ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><circle cx="2.75" cy="3.5" r="1.25"/><circle cx="6" cy="8" r="1.25"/><circle cx="6" cy="12.5" r="1.25"/></g><path d="M5.5 3.5h8M9 8h4.5M9 12.5h4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

export interface Toc {
  /** Goes first in the preview, before the document. */
  readonly element: HTMLElement;
  /** Lists the document's headings again, after it was drawn. */
  update(): void;
  destroy(): void;
}

export function initToc(scroller: HTMLElement, article: HTMLElement): Toc {
  const element = document.createElement('div');
  element.className = 'toc';
  element.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toc-button';
  button.innerHTML = ICON;
  button.title = 'Contents';
  button.setAttribute('aria-label', 'Contents');
  button.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('nav');
  panel.className = 'toc-panel';
  panel.id = 'toc-panel';
  panel.setAttribute('aria-label', 'Contents');
  button.setAttribute('aria-controls', panel.id);
  const list = document.createElement('ol');
  panel.append(list);
  element.append(button, panel);

  let targets: HTMLElement[] = [];
  let items: HTMLButtonElement[] = [];

  // Opened by a click, it stays open until another click, Escape, or a heading is chosen.
  const setOpen = (open: boolean): void => {
    element.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(!element.classList.contains('open')));
  const outside = (event: PointerEvent): void => {
    if (!element.contains(event.target as Node)) setOpen(false);
  };
  document.addEventListener('pointerdown', outside);
  // Tabbing away from the button and the list closes it.
  element.addEventListener('focusout', (event) => {
    if (!element.contains(event.relatedTarget as Node | null)) setOpen(false);
  });
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !element.classList.contains('open')) return;
    setOpen(false);
    button.focus();
  });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const go = (target: HTMLElement): void => {
    reveal(target);
    // Only the preview scrolls: scrollIntoView would move the page too.
    const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollBy({ top: offset - 16, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    setOpen(false);
  };

  // The section being read: the last heading that has reached the top of the preview.
  let pending = false;
  const markCurrent = (): void => {
    pending = false;
    const line = scroller.getBoundingClientRect().top + 64;
    let current = -1;
    targets.forEach((target, i) => {
      // A heading in a collapsed section has no place on the page.
      if (drawn(target) && target.getBoundingClientRect().top <= line) current = i;
    });
    // At the very end, the last heading is current even if it can't reach the line.
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = targets.length - 1;
    items.forEach((item, i) => {
      if (i === current) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  };
  scroller.addEventListener(
    'scroll',
    () => {
      if (pending || element.hidden) return;
      pending = true;
      requestAnimationFrame(markCurrent);
    },
    { passive: true },
  );

  return {
    element,
    update() {
      // The footnotes' own heading is for screen readers only, and not part of the outline.
      targets = [...article.querySelectorAll<HTMLElement>('h1, h2, h3, h4')].filter(
        (h) => !h.closest('.footnotes') && (h.textContent ?? '').trim() !== '',
      );
      const headings = outline(targets.map((h) => ({ level: Number(h.tagName[1]), text: h.textContent ?? '' })));
      element.hidden = headings.length < MIN_HEADINGS;
      if (element.hidden) setOpen(false);
      items = headings.map(({ level, text }, i) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = text;
        item.style.setProperty('--level', String(level));
        item.addEventListener('click', () => {
          const target = targets[i];
          if (target) go(target);
        });
        return item;
      });
      list.replaceChildren(
        ...items.map((item) => {
          const li = document.createElement('li');
          li.append(item);
          return li;
        }),
      );
      markCurrent();
    },
    destroy() {
      document.removeEventListener('pointerdown', outside);
    },
  };
}
