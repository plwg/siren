// What Siren leaves out of a drawing, and the placeholders it draws instead.
//
// Images: a shared diagram could otherwise make every viewer's browser fetch a URL its author chose,
// revealing who viewed it and when. Each <image> becomes a dashed box of the same size. The page's
// Content Security Policy blocks remote images too, should one ever get past this.
//
// Icons: Siren has no icon set. Pele asks the page for each icon it meets and draws only a few
// architecture icons itself. An icon asked for but not drawn is one that isn't shown. Icons on node
// shapes keep an empty slot, which gets a placeholder; icons inside labels take no room at all.
//
// The drawing is parsed into an inert document, which never loads anything, and changed there.

const SVG = 'http://www.w3.org/2000/svg';

/** Pele's icon resolver for one drawing at a time: it supplies no drawings, only notes the names. */
export class IconTracker {
  private asked = new Set<string>();
  readonly resolve = (name: string): undefined => {
    this.asked.add(name);
  };
  /** The names asked for since the last call. */
  take(): Set<string> {
    const names = this.asked;
    this.asked = new Set();
    return names;
  }
}

export interface Omitted {
  images: number;
  icons: string[];
}

const make = (doc: Document, tag: string, attrs: Record<string, string>): Element => {
  const el = doc.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
};

function replaceImages(doc: Document): number {
  const images = [...doc.getElementsByTagNameNS(SVG, 'image')];
  for (const image of images) {
    const num = (name: string): number => Number.parseFloat(image.getAttribute(name) ?? '') || 0;
    const [x, y, width, height] = [num('x'), num('y'), num('width'), num('height')];
    const box = make(doc, 'g', { class: 'siren-omitted' });
    const title = make(doc, 'title', {});
    title.textContent = 'Image not shown';
    box.append(
      title,
      make(doc, 'rect', {
        x: String(x),
        y: String(y),
        width: String(width),
        height: String(height),
        rx: '4',
        fill: 'none',
        stroke: 'var(--_m)',
        'stroke-dasharray': '4 3',
      }),
    );
    if (width >= 40 && height >= 18) {
      const label = make(doc, 'text', {
        x: String(x + width / 2),
        y: String(y + height / 2 + 3.5),
        'text-anchor': 'middle',
        'font-size': '10',
        fill: 'var(--_m)',
      });
      label.textContent = 'image';
      box.append(label);
    }
    const transform = image.getAttribute('transform');
    if (transform) box.setAttribute('transform', transform);
    image.replaceWith(box);
  }
  return images.length;
}

function markMissingIcons(doc: Document, asked: Set<string>): string[] {
  const drawn = new Set<string>();
  for (const slot of doc.querySelectorAll('svg.pele-icon')) {
    const name = slot.getAttribute('data-icon') ?? '';
    if (slot.childElementCount > 0) {
      drawn.add(name);
      continue;
    }
    const title = make(doc, 'title', {});
    title.textContent = `Icon not shown: ${name}`;
    slot.setAttribute('opacity', '0.55');
    slot.append(
      title,
      make(doc, 'rect', {
        x: '3',
        y: '3',
        width: '18',
        height: '18',
        rx: '3',
        'stroke-width': '1.5',
        'stroke-dasharray': '3 2',
      }),
    );
  }
  return [...asked].filter((name) => !drawn.has(name));
}

const parse = (svg: string): Document => {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The drawing could not be read.');
  return doc;
};

const process = (doc: Document, asked: Set<string>): Omitted => ({
  images: replaceImages(doc),
  icons: markMissingIcons(doc, asked),
});

/** The drawing as a node for the page, with what was left out. `asked` comes from an IconTracker. */
export function omitForPage(svg: string, asked: Set<string>): { node: Node; omitted: Omitted } {
  const doc = parse(svg);
  const omitted = process(doc, asked);
  return { node: document.importNode(doc.documentElement, true), omitted };
}

/** The drawing as text for a file, with what was left out. */
export function omitForFile(svg: string, asked: Set<string>): { svg: string; omitted: Omitted } {
  const doc = parse(svg);
  const omitted = process(doc, asked);
  return { svg: new XMLSerializer().serializeToString(doc), omitted };
}

/** A sentence for each kind of thing left out, or null when nothing was. */
export function describe({ images, icons }: Omitted): string | null {
  const parts: string[] = [];
  if (images) {
    parts.push(
      `${images === 1 ? 'This diagram has an image' : `This diagram has ${images} images`}. Siren doesn't show images, so a shared link can't track who views it.`,
    );
  }
  if (icons.length) {
    const unique = [...new Set(icons)];
    const named =
      unique.length <= 2 ? unique.join(' and ') : `${unique.slice(0, 2).join(', ')} and ${unique.length - 2} more`;
    parts.push(`Siren has no icon set, so ${named} ${unique.length === 1 ? "isn't" : "aren't"} drawn.`);
  }
  return parts.length ? parts.join(' ') : null;
}
