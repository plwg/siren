import { render } from 'pele';

// Siren draws diagrams without images (see main.ts), which would otherwise drop them silently.
// To say so, draw the text once more with images allowed, into a string that is never shown, and
// count them. That follows Pele's own syntax rather than guessing at it with a pattern.

let lastSource = '';
let lastCount = 0;

/** How many images the diagram asks for, which Siren leaves out. */
export function countImages(source: string): number {
  // Every image syntax names `img`; skip the second drawing for the many diagrams without one.
  if (!/img/i.test(source)) return 0;
  if (source === lastSource) return lastCount;
  let count = 0;
  try {
    count = render(source, { images: true }).svg.match(/<image\b/g)?.length ?? 0;
  } catch {
    // Text that cannot be drawn has its own error message.
  }
  lastSource = source;
  lastCount = count;
  return count;
}
