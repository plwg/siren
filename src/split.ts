// The divider between the editor and the diagram, on wide screens. Drag it, or focus it and use
// the arrow keys; double-click resets it. The split is kept as a share of the width, so it holds
// when the window is resized, and remembered in this browser.

const STORAGE_KEY = 'siren-split';
const MIN_EDITOR = 240;
const MIN_DIAGRAM = 280;
const STEP = 24;

/** A saved share of the width, or null if none is saved or it's out of range. */
export function parseShare(raw: string | null): number | null {
  const share = Number(raw);
  return raw !== null && Number.isFinite(share) && share >= 0.1 && share <= 0.9 ? share : null;
}

/** The editor's width in pixels for a wanted width, kept clear of both minimums. */
export function clampWidth(wanted: number, total: number): number {
  return Math.round(Math.min(Math.max(wanted, MIN_EDITOR), Math.max(MIN_EDITOR, total - MIN_DIAGRAM)));
}

export function initSplit(): void {
  const main = document.querySelector('main') as HTMLElement;
  const editor = document.querySelector('.editor') as HTMLElement;
  const divider = document.getElementById('divider') as HTMLElement;

  const apply = (share: number | null): void => {
    if (share === null) main.style.removeProperty('--editor-size');
    else main.style.setProperty('--editor-size', `${(share * 100).toFixed(2)}%`);
    const now = editor.getBoundingClientRect().width / Math.max(1, main.getBoundingClientRect().width);
    divider.setAttribute('aria-valuenow', String(Math.round(now * 100)));
  };

  const save = (share: number | null): void => {
    try {
      if (share === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, share.toFixed(4));
    } catch {
      // Storage can be blocked; the split still holds for this visit.
    }
  };

  /** Sets the editor to a width in pixels, within the limits, and keeps it. */
  const setWidth = (wanted: number): void => {
    const total = main.getBoundingClientRect().width;
    const share = clampWidth(wanted, total) / total;
    apply(share);
    save(share);
  };

  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // No storage: start from the default split.
  }
  apply(parseShare(saved));

  divider.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    divider.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing');
    const left = main.getBoundingClientRect().left;
    const move = (e: PointerEvent): void => setWidth(e.clientX - left);
    const stop = (): void => {
      document.body.classList.remove('resizing');
      divider.removeEventListener('pointermove', move);
      divider.removeEventListener('pointerup', stop);
      divider.removeEventListener('pointercancel', stop);
    };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', stop);
    divider.addEventListener('pointercancel', stop);
  });

  divider.addEventListener('keydown', (event) => {
    const width = editor.getBoundingClientRect().width;
    const step = event.shiftKey ? STEP * 4 : STEP;
    const next: Record<string, number> = {
      ArrowLeft: width - step,
      ArrowRight: width + step,
      Home: 0,
      End: Number.POSITIVE_INFINITY,
    };
    const wanted = next[event.key];
    if (wanted === undefined) return;
    event.preventDefault();
    setWidth(wanted);
  });

  divider.addEventListener('dblclick', () => {
    apply(null);
    save(null);
  });
}
