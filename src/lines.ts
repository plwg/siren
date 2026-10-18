// The editor's backdrop: the text again, one block per line, so each line can carry its number and
// the line with an error can be marked. The textarea draws the text itself; here it is invisible
// and only makes the lines wrap exactly as the textarea's do.

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The text as HTML, one `<span class="line">` per line. `errorLine` counts from 1. */
export function numberedLines(text: string, errorLine: number | null = null): string {
  return text
    .split('\n')
    .map((line, i) => {
      const cls = i + 1 === errorLine ? 'line error' : 'line';
      // An empty line still needs height; a space keeps it without changing how text wraps.
      return `<span class="${cls}">${escapeHtml(line) || ' '}</span>`;
    })
    .join('');
}
