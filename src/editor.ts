import { highlight } from './highlight';

// The editor is a plain textarea, so typing, undo, selection and mobile keyboards behave as usual.
// Behind it, a <pre> holds the same text highlighted, with line numbers; the textarea's own text is
// transparent. Both must wrap identically: index.html gives them the same font, padding and
// scrollbar room.

export interface Editor {
  /** Redraws the backdrop, after the text was set from code. */
  refresh(): void;
  /** Marks a line (counting from 1) as the one with an error, or clears it with null. */
  setErrorLine(line: number | null): void;
}

// A pasted ```mermaid … ``` block, as copied from GitHub, chat or docs.
const FENCED = /^\s*(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)\n?[ \t]*\1[ \t]*\s*$/i;

/** Inserts text at the cursor as if typed, so it can be undone. */
export function insertText(textarea: HTMLTextAreaElement, text: string): void {
  textarea.focus();
  // execCommand is the one way to insert text that the browser's undo history records.
  if (!document.execCommand('insertText', false, text)) {
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Replaces all of the text as one undoable change. */
export function replaceText(textarea: HTMLTextAreaElement, text: string): void {
  textarea.focus();
  textarea.select();
  insertText(textarea, text);
  textarea.setSelectionRange(0, 0);
  textarea.scrollTop = 0;
}

export function initEditor(textarea: HTMLTextAreaElement, backdrop: HTMLElement): Editor {
  const container = backdrop.parentElement as HTMLElement;
  let errorLine: number | null = null;

  const draw = (): void => {
    backdrop.innerHTML = highlight(textarea.value, errorLine);
    // The gutter fits the widest line number.
    container.style.setProperty('--digits', String(String(textarea.value.split('\n').length).length));
    sync();
  };
  const sync = (): void => {
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  };

  textarea.addEventListener('input', () => {
    // An edit may well fix the error; the next drawing says whether it did.
    errorLine = null;
    draw();
  });
  textarea.addEventListener('scroll', sync);
  new ResizeObserver(sync).observe(textarea);

  textarea.addEventListener('paste', (event) => {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    const fenced = pasted.match(FENCED);
    if (!fenced) return;
    event.preventDefault();
    insertText(textarea, fenced[2] ?? '');
  });

  draw();
  return {
    refresh: draw,
    setErrorLine(line) {
      if (line === errorLine) return;
      errorLine = line;
      draw();
    },
  };
}

/** The diagram in a fenced ```mermaid block, or null if the text isn't one. For tests. */
export const unfence = (text: string): string | null => text.match(FENCED)?.[2] ?? null;
