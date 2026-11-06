// Fetches the syntax highlighter (languages.ts) only when needed, like diagram types (diagrams.ts):
// before drawing a document whose code blocks name a language, or once the page is idle, so
// Siren still highlights offline once it has settled. Until it arrives, code shows as plain text.

type Highlight = (code: string, language: string) => string | null;

let ready: Highlight | null = null;
let loading: Promise<boolean> | null = null;

/** The highlighter, or null if it hasn't arrived yet. */
export const highlighter = (): Highlight | null => ready;

/** Fetches the highlighter; false if it couldn't (offline before it arrived). A later call tries again. */
export function loadHighlighter(): Promise<boolean> {
  loading ??= import('./languages').then(
    (module) => {
      ready = module.highlight;
      return true;
    },
    () => {
      loading = null;
      return false;
    },
  );
  return loading;
}
