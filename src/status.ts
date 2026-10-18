// The message line. A standing message describes the diagram (a parse error, a warning) and stays
// while it holds; a flash reports an action (a copy, a failed export) and gives way after a moment.

type Kind = 'info' | 'warning' | 'error';
interface Message {
  text: string;
  kind: Kind;
}

const status = document.getElementById('status') as HTMLElement;
let standing: Message | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const show = (message: Message | null): void => {
  status.textContent = message?.text ?? '';
  status.dataset.kind = message?.kind ?? '';
};

/** Sets the message about the diagram itself, or clears it with null. */
export function setStanding(text: string | null, kind: Exclude<Kind, 'info'> = 'error'): void {
  const next = text ? { text, kind } : null;
  const changed = next?.text !== standing?.text || next?.kind !== standing?.kind;
  standing = next;
  // Pele draws again on resizes and font loads; only a change may cut a passing message short.
  if (timer && !changed) return;
  clearTimeout(timer);
  timer = undefined;
  show(standing);
}

/** Shows a passing message, then returns to the standing one. */
export function flash(text: string, kind: Kind = 'info'): void {
  clearTimeout(timer);
  show({ text, kind });
  timer = setTimeout(() => {
    timer = undefined;
    show(standing);
  }, kind === 'error' ? 6000 : 3000);
}
