import { mount } from 'pele/lazy';
import pkg from '../package.json';
import { ready } from './engine';
import { type Exported, exportSvg, svgToPng } from './export';
import { decodeDiagram, encodeDiagram } from './hash';
import { countImages } from './images';
import { initLayout } from './layout';
import { guardLinks } from './links';
import { exportOptions, initMenu } from './menu';
import { flash, setStanding } from './status';
import { initThemes, linkTheme } from './theme';

// The last node links to Siren with no diagram in the URL, which opens this sample again: as close
// to a quine as a link can get, since a URL can't contain an encoding of text that contains it.
const DEFAULT = `flowchart LR
  A[Write Mermaid] --> B{Pele}
  B --> C[SVG]
  C --> D[Share the link]
  click B href "https://github.com/obsidianmd/pele" "Pele on GitHub"
  click D href "https://plwg.github.io/siren/" "Opens this diagram again"`;

const fromHash = (): string | null => decodeDiagram(location.hash.slice(1));

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

if (new URLSearchParams(location.search).has('view')) document.body.classList.add('view');
initThemes();
initLayout();
const menu = initMenu();

const source = byId<HTMLTextAreaElement>('source');
const diagram = byId('diagram');
source.value = fromHash() ?? DEFAULT;

await ready(source.value);

// No images: a shared diagram could otherwise make every viewer's browser fetch a URL its author
// chose, revealing who viewed it and when. The page's Content Security Policy blocks them too.
const mounted = mount(diagram, source.value, {
  images: false,
  onRender: () => {
    const images = countImages(source.value);
    setStanding(
      images
        ? `${images === 1 ? 'This diagram has an image' : `This diagram has ${images} images`}. Siren doesn't show images, so a shared link can't track who views it.`
        : null,
      'warning',
    );
  },
  onError: (e) => setStanding(e instanceof Error ? e.message : String(e)),
});

guardLinks(diagram);

// Draws new text once its diagram type's code has loaded, skipping any text replaced meanwhile.
let drawing = 0;
const draw = async (text: string): Promise<void> => {
  const turn = ++drawing;
  await ready(text);
  if (turn === drawing) mounted.update(text);
};

// Pele measures labels in the page's fonts, so draw again once the web fonts arrive.
void document.fonts.ready.then(() => mounted.refresh());

let timer: ReturnType<typeof setTimeout> | undefined;
source.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void draw(source.value);
    history.replaceState(null, '', `${location.pathname}${location.search}#${encodeDiagram(source.value)}`);
  }, 150);
});

window.addEventListener('hashchange', () => {
  const text = fromHash();
  if (text !== null && text !== source.value) {
    source.value = text;
    void draw(text);
  }
  updateEditLink();
});

// On view pages, Edit in Siren opens the editor on the same diagram, in the viewer's own theme.
// Embedded in another site, it opens in a new tab rather than inside the embed.
const editLink = byId<HTMLAnchorElement>('edit-link');
function updateEditLink(): void {
  editLink.href = `${location.pathname}${location.hash}`;
}
updateEditLink();
if (window.top !== window) {
  editLink.target = '_blank';
  editLink.rel = 'noopener';
}

// A view link carries an explicitly chosen theme, so an embedded diagram looks the way it was shared.
const link = (asView: boolean): string => {
  const params: string[] = [];
  if (asView) params.push('view');
  const theme = linkTheme();
  if (asView && theme) params.push(`theme=${theme}`);
  const query = params.length ? `?${params.join('&')}` : '';
  return `${location.origin}${location.pathname}${query}#${encodeDiagram(source.value)}`;
};
const copy = async (text: string, label: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    flash(`${label} copied`);
  } catch {
    flash(`Couldn't copy the ${label.toLowerCase()}. Copy it from the address bar instead.`, 'error');
  }
};

byId('pele-version').textContent = pkg.dependencies.pele;

// Each menu action closes the menu and reports back in the header.
const action = (id: string, run: () => unknown): void =>
  byId(id).addEventListener('click', () => {
    menu.close();
    void run();
  });

// The diagram drawn for export, or null after telling the user why it can't be.
const exported = async (): Promise<Exported | null> => {
  await ready(source.value);
  try {
    return exportSvg(source.value, exportOptions());
  } catch {
    flash('Fix the diagram before exporting it.', 'error');
    return null;
  }
};

const download = (blob: Blob, name: string): void => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

action('copy-link', () => copy(link(false), 'Link'));
action('copy-view', () => copy(link(true), 'View link'));
action('download-svg', async () => {
  const result = await exported();
  if (result) download(new Blob([result.svg], { type: 'image/svg+xml' }), 'diagram.svg');
});
action('download-png', async () => {
  const result = await exported();
  if (result) download(await svgToPng(result), 'diagram.png');
});
action('copy-image', async () => {
  // The clipboard item is made inside the click, with the PNG still to come: browsers allow the
  // write only during the click, and drawing may first need to load the diagram type's code.
  let unexportable = false;
  const png = exported().then((result) => {
    if (result) return svgToPng(result);
    unexportable = true;
    throw new Error('The diagram cannot be exported.');
  });
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    flash('Image copied');
  } catch {
    // An unexportable diagram has already said why.
    if (!unexportable) flash("Couldn't copy the image here. Download a PNG instead.", 'error');
  }
});
