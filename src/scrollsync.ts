// Scrolls the editor and a Markdown preview together. Each element at the top of the preview
// carries the source line it starts on (markdown.ts), and the editor's backdrop has an element
// per source line (editor.ts), so both panes can say where every block is. Between those
// anchors the panes scroll in proportion, so a tall diagram drawn from a few lines doesn't pull
// the rest out of step, and both reach their ends together.
//
// Only the pane the reader last touched leads: the other pane's scroll events are ours, or the
// page settling after an edit, and following them would bounce the panes back and forth.
//
// On phones the panes take turns. The place is kept as a source line, and a pane that comes into
// view opens at that line.

export type Point = readonly [number, number];

/** The y for `x` on the line through `points`, which run left to right; flat past either end. */
export function interpolate(points: readonly Point[], x: number): number {
  const first = points[0];
  if (!first) return x;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i] as Point;
    if (x <= x1) {
      const [x0, y0] = points[i - 1] as Point;
      return x1 === x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return (points[points.length - 1] as Point)[1];
}

/**
 * Matching scroll positions in two panes: both tops, each anchor both panes can reach, and both
 * ends. Anchors out of order or past either end are dropped, so the line only goes up.
 */
export function pairs(anchors: readonly Point[], fromMax: number, toMax: number): Point[] {
  const points: Point[] = [[0, 0]];
  for (const [a, b] of anchors) {
    const [pa, pb] = points[points.length - 1] as Point;
    if (a > pa && b > pb && a < fromMax && b < toMax) points.push([a, b]);
  }
  points.push([fromMax, toMax]);
  return points;
}

export interface ScrollSync {
  /** Brings the other pane in line with the one the reader leads with, as after an edit. */
  realign(): void;
}

type Pane = 'editor' | 'preview';

export function initScrollSync(
  textarea: HTMLTextAreaElement,
  backdrop: HTMLElement,
  preview: HTMLElement,
  active: () => boolean,
): ScrollSync {
  const element = (pane: Pane): HTMLElement => (pane === 'editor' ? textarea : preview);
  const other = (pane: Pane): Pane => (pane === 'editor' ? 'preview' : 'editor');
  const visible = (pane: Pane): boolean => element(pane).clientHeight > 0;
  const maxScroll = (pane: Pane): number => {
    const el = element(pane);
    return Math.max(0, el.scrollHeight - el.clientHeight);
  };

  // Where the source line starting each preview block is, in each pane's scroll coordinates.
  const anchors = (): { line: number; editor: number; preview: number }[] => {
    const lines = backdrop.children;
    const top = preview.getBoundingClientRect().top + preview.clientTop - preview.scrollTop;
    const found = [];
    for (const block of preview.querySelectorAll<HTMLElement>('[data-line]')) {
      const line = Number(block.dataset.line);
      const span = lines[line - 1] as HTMLElement | undefined;
      if (!span) continue;
      found.push({ line, editor: span.offsetTop, preview: block.getBoundingClientRect().top - top });
    }
    return found;
  };

  // The source line at the top of a pane, with a fraction for the way through it.
  const lineAt = (pane: Pane): number => {
    const points: Point[] = [[0, 1], ...anchors().map((a): Point => [a[pane], a.line])];
    points.push([element(pane).scrollHeight, backdrop.children.length + 1]);
    return interpolate(points, element(pane).scrollTop);
  };
  const scrollToLine = (pane: Pane, line: number): void => {
    const points: Point[] = [[1, 0], ...anchors().map((a): Point => [a.line, a[pane]])];
    points.push([backdrop.children.length + 1, element(pane).scrollHeight]);
    element(pane).scrollTop = interpolate(points, line);
  };

  let leader: Pane = 'editor';
  let topLine = 1;

  const follow = (from: Pane): void => {
    const to = other(from);
    const fromMax = maxScroll(from);
    const toMax = maxScroll(to);
    if (fromMax === 0 || toMax === 0) return;
    const points = pairs(
      anchors().map((a): Point => [a[from], a[to]]),
      fromMax,
      toMax,
    );
    element(to).scrollTop = interpolate(points, element(from).scrollTop);
  };

  const scrolled = (pane: Pane): void => {
    if (pane !== leader || !active() || !visible(pane)) return;
    topLine = lineAt(pane);
    if (visible(other(pane))) follow(pane);
  };

  // What counts as the reader taking hold of a pane: the wheel, a click or touch (on the content
  // or the scrollbar), or a key.
  for (const pane of ['editor', 'preview'] as const) {
    const el = element(pane);
    const lead = (): void => {
      leader = pane;
    };
    for (const type of ['wheel', 'pointerdown', 'touchstart', 'keydown']) {
      el.addEventListener(type, lead, { passive: true });
    }
    el.addEventListener('scroll', () => scrolled(pane), { passive: true });
  }

  const realign = (): void => {
    if (!active()) return;
    if (visible(leader)) topLine = lineAt(leader);
    if (visible('editor') && visible('preview')) follow(leader);
  };

  // Resizing rewraps the text, so the panes line up again. On phones, a pane coming into view
  // opens where the reader was in the other.
  const shown = { editor: visible('editor'), preview: visible('preview') };
  const observer = new ResizeObserver(() => {
    for (const pane of ['editor', 'preview'] as const) {
      const appeared = visible(pane) && !shown[pane];
      shown[pane] = visible(pane);
      if (appeared && active() && !visible(other(pane))) scrollToLine(pane, topLine);
    }
    if (active() && shown.editor && shown.preview) follow(leader);
  });
  observer.observe(textarea);
  observer.observe(preview);

  return { realign };
}
