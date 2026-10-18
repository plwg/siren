import { detectType, load } from 'pele/lazy';

// Siren uses Pele's lazy entry everywhere: each diagram type's code downloads the first time a
// diagram of that type is drawn, so a flowchart doesn't wait for the other thirty-odd types.
// Importing from 'pele' instead would bundle all of them again.

/** Loads the code for the diagram type this text needs. Unknown or invalid text loads nothing. */
export async function ready(text: string): Promise<void> {
  let type: ReturnType<typeof detectType> = null;
  try {
    type = detectType(text);
  } catch {
    // Pele reports what is wrong with the text when it draws it.
  }
  await load(type).catch(() => {
    // A failed download shows as Pele's error for an unknown type, when drawn.
  });
}
