// Pele reports an error's line after removing front matter, directives and comment lines, so its
// number can be a few lines early, and an unfinished diagram is reported on the line after the
// end. Its snippet holds the offending line's text, which finds the line in what the user typed.

interface Located {
  line: number;
  snippet: string;
}

const isLocated = (error: unknown): error is Located =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as Located).line === 'number' &&
  typeof (error as Located).snippet === 'string';

/** The line of `text`, counting from 1, that a Pele error is about, or null if it has none. */
export function errorLine(text: string, error: unknown): number | null {
  if (!isLocated(error) || error.line < 1) return null;
  const lines = text.split('\n');
  const offending = error.snippet.split('\n')[0] ?? '';
  if (offending.trim() !== '') {
    // Lines are only ever removed, so the real line is at or after the reported one.
    for (let i = error.line - 1; i < lines.length; i++) if (lines[i] === offending) return i + 1;
    const anywhere = lines.indexOf(offending);
    if (anywhere !== -1) return anywhere + 1;
  }
  // The text ended too soon: the last line with anything on it is the unfinished one.
  for (let i = lines.length - 1; i >= 0; i--) if ((lines[i] ?? '').trim() !== '') return i + 1;
  return null;
}
