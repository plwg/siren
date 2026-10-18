import { render } from 'pele';

// Exports are for pasting into documents, so they ignore the editor theme: light colors on a
// transparent canvas, in fonts every document app has. Pele never paints a full background;
// `bg` only fills the patches behind edge labels and the gaps between pie slices, so it stays
// white for a white page.
const FONT = 'Arial, Helvetica, sans-serif';
const FONT_MONO = '"Courier New", Courier, monospace';

const PALETTE: Record<string, string> = {
  bg: '#ffffff',
  fg: '#132321',
  muted: '#556866',
  line: '#2a3c3a',
  surface: '#e2eae9',
  'surface-alt': '#d3dfdd',
  border: '#b7c7c5',
  accent: '#0a6c73',
  critical: '#b3261e',
  font: FONT,
  'font-mono': FONT_MONO,
  radius: '6px',
};

/** The diagram drawn again for a document: measured in the export fonts, colors baked in. */
export function exportSvg(source: string): string {
  // Not responsive, so the file has a fixed pixel size instead of stretching to its container.
  const { svg } = render(source, { fontFamily: FONT, fontFamilyMono: FONT_MONO, responsive: false });
  return svg.replace(/var\(--pele-([\w-]+),([^()]*)\)/g, (match, name: string) => {
    const value = PALETTE[name];
    return value ? value.replace(/"/g, '&quot;') : match;
  });
}
