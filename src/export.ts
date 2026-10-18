import { render } from 'pele';

// Exports are for pasting into documents and slides, so they ignore the editor theme. They are
// drawn again in fonts every document app has, with the chosen colors baked in. Pele never paints
// a full background; `bg` only fills the patches behind edge labels and the gaps between pie
// slices, so it matches the page the diagram will sit on. A solid background adds a full rect.
const FONT = 'Arial, Helvetica, sans-serif';
const FONT_MONO = '"Courier New", Courier, monospace';

export type Palette = 'sea' | 'neutral';
export type Mode = 'light' | 'dark';
export type Background = 'clear' | 'solid';

export interface ExportOptions {
  palette: Palette;
  mode: Mode;
  background: Background;
}

export const DEFAULT_EXPORT: ExportOptions = { palette: 'sea', mode: 'light', background: 'clear' };

type Colors = Record<
  'bg' | 'fg' | 'muted' | 'line' | 'surface' | 'surface-alt' | 'border' | 'accent' | 'critical',
  string
>;

const PALETTES: Record<Palette, Record<Mode, Colors>> = {
  // The Shallows and Deep editor themes, on white and on deep water.
  sea: {
    light: {
      bg: '#ffffff',
      fg: '#132321',
      muted: '#556866',
      line: '#2a3c3a',
      surface: '#e2eae9',
      'surface-alt': '#d3dfdd',
      border: '#b7c7c5',
      accent: '#0a6c73',
      critical: '#b3261e',
    },
    dark: {
      bg: '#0e1416',
      fg: '#d7e3e1',
      muted: '#8fa2a0',
      line: '#b6c7c5',
      surface: '#1b272a',
      'surface-alt': '#243439',
      border: '#34474c',
      accent: '#5ec2c3',
      critical: '#f28b82',
    },
  },
  // Plain greys with a quiet blue accent, for formal documents.
  neutral: {
    light: {
      bg: '#ffffff',
      fg: '#1f1f1f',
      muted: '#5f6368',
      line: '#3c4043',
      surface: '#f1f3f4',
      'surface-alt': '#e3e5e8',
      border: '#bdc1c6',
      accent: '#2f5f9e',
      critical: '#b3261e',
    },
    dark: {
      bg: '#1e1e1e',
      fg: '#e8eaed',
      muted: '#9aa0a6',
      line: '#d0d3d6',
      surface: '#2b2c2e',
      'surface-alt': '#37383b',
      border: '#5f6368',
      accent: '#8ab4f8',
      critical: '#f28b82',
    },
  },
};

export interface Exported {
  svg: string;
  width: number;
  height: number;
}

/** The diagram drawn again for a document: measured in the export fonts, colors baked in. */
export function exportSvg(source: string, options: ExportOptions): Exported {
  // Not responsive, so the file has a fixed pixel size instead of stretching to its container.
  // No links or images: an exported file travels without Siren's link check, and a remote image
  // would load each time the document is opened.
  const { svg, width, height } = render(source, {
    fontFamily: FONT,
    fontFamilyMono: FONT_MONO,
    responsive: false,
    links: false,
    images: false,
  });
  const colors = PALETTES[options.palette][options.mode];
  const values: Record<string, string> = { ...colors, font: FONT, 'font-mono': FONT_MONO, radius: '6px' };
  let out = svg.replace(/var\(--pele-([\w-]+),([^()]*)\)/g, (match, name: string) => {
    const value = values[name];
    return value ? value.replace(/"/g, '&quot;') : match;
  });
  if (options.background === 'solid') {
    out = out.replace(/<svg\b[^>]*>/, (open) => `${open}<rect width="100%" height="100%" fill="${colors.bg}"/>`);
  }
  return { svg: out, width, height };
}

/** Rasterizes an exported SVG at `scale` times its size, for pasting where SVG is not accepted. */
export async function svgToPng({ svg, width, height }: Exported, scale = 2): Promise<Blob> {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the PNG.'))), 'image/png'),
  );
}
