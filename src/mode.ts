// Siren edits two kinds of text, chosen by the user rather than guessed: a Mermaid diagram, or a
// Markdown document with ```mermaid blocks in it. The link carries the mode (see hash.ts).

export type EditorMode = 'mermaid' | 'markdown';

export const MODES: readonly EditorMode[] = ['mermaid', 'markdown'];

/** What the preview shows, for messages: "this diagram", "this document". */
export const noun = (mode: EditorMode): 'diagram' | 'document' => (mode === 'markdown' ? 'document' : 'diagram');
