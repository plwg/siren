import { encode } from 'uqr';

// QR codes for share links. Loaded only when the QR dialog opens, so the encoder isn't part of the
// page's first download.

export interface Qr {
  /** Black on white, with the standard four-module quiet zone, whatever the page theme. */
  svg: string;
  /** Modules across, quiet zone included. */
  size: number;
  /** The rows of modules, quiet zone included; true is black. */
  modules: boolean[][];
}

/** A QR code for the text, or null if the text is too long for one. */
export function qrCode(text: string, pixels = 8): Qr | null {
  // Medium error correction survives a smudged screen or a glare; a longer link that won't fit
  // falls back to low, which holds the most.
  for (const ecc of ['M', 'L'] as const) {
    let modules: boolean[][];
    try {
      modules = encode(text, { ecc, border: 4 }).data;
    } catch {
      continue;
    }
    const size = modules.length;
    let path = '';
    modules.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) path += `M${x} ${y}h1v1h-1z`;
      });
    });
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * pixels}" height="${size * pixels}" shape-rendering="crispEdges">` +
      `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
    return { svg, size, modules };
  }
  return null;
}
