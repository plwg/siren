import { mount } from 'pele/lazy';
import pkg from '../package.json';
import { initEditor } from './editor';
import { ready } from './engine';
import { errorLine } from './errorline';
import { type Exported, exportSvg, svgToPng } from './export';
import { decodeDiagram, encodeDiagram } from './hash';
import { initLayout } from './layout';
import { initLibrary } from './library';
import { guardLinks } from './links';
import { exportOptions, initMenu } from './menu';
import { describe, IconTracker, type Omitted, omitForPage } from './omitted';
import { initSplit } from './split';
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
initSplit();
const menu = initMenu();

const source = byId<HTMLTextAreaElement>('source');
const diagram = byId('diagram');
source.value = fromHash() ?? DEFAULT;
const editor = initEditor(source, byId('code'));

// An empty editor isn't an error: the diagram pane says how to start instead. Pele always draws
// something, so while the editor is empty it draws a blank flowchart that stays hidden.
const BLANK = 'flowchart LR';
const isBlank = (text: string): boolean => text.trim() === '';
if (document.body.classList.contains('view')) {
  diagram.dataset.empty = 'This link has no diagram.';
  diagram.dataset.emptyNarrow = diagram.dataset.empty;
} else {
  diagram.dataset.empty = 'Type Mermaid on the left, or start from an example in the ☰ menu.';
  diagram.dataset.emptyNarrow = 'Type Mermaid in the Code tab, or start from an example in the ☰ menu.';
}
const showBlank = (blank: boolean): void => {
  diagram.classList.toggle('blank', blank);
  if (blank) {
    editor.setErrorLine(null);
    setStanding(null);
  }
};

await ready(isBlank(source.value) ? BLANK : source.value);

// Images and icons Siren leaves out are swapped for placeholders before the drawing reaches the
// page (see omitted.ts), and named in a warning.
let omitted: Omitted = { images: 0, icons: [] };
const icons = new IconTracker();
const mounted = mount(diagram, isBlank(source.value) ? BLANK : source.value, {
  icons: icons.resolve,
  sanitize: (svg) => {
    const result = omitForPage(svg, icons.take());
    omitted = result.omitted;
    return result.node;
  },
  onRender: () => {
    editor.setErrorLine(null);
    setStanding(describe(omitted), 'warning');
  },
  onError: (e) => {
    editor.setErrorLine(errorLine(source.value, e));
    setStanding(e instanceof Error ? e.message : String(e));
  },
});

guardLinks(diagram);

// Draws new text once its diagram type's code has loaded, skipping any text replaced meanwhile.
let drawing = 0;
const draw = async (text: string): Promise<void> => {
  const turn = ++drawing;
  if (isBlank(text)) {
    showBlank(true);
    return;
  }
  await ready(text);
  if (turn !== drawing) return;
  showBlank(false);
  mounted.update(text);
};
showBlank(isBlank(source.value));

// Pele measures labels in the page's fonts, so draw again once the web fonts arrive.
void document.fonts.ready.then(() => mounted.refresh());

// Recent diagrams: kept a moment after edits settle, if the diagram draws. Not on view pages.
const viewing = document.body.classList.contains('view');
const library = initLibrary(source, [DEFAULT], (message) => flash(message));
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const saveSoon = (): void => {
  if (viewing) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!mounted.error) library.saved(source.value);
  }, 1000);
};
// A diagram that arrived in a link is kept too, so it can be found again.
if (fromHash() !== null) saveSoon();

let timer: ReturnType<typeof setTimeout> | undefined;
source.addEventListener('input', () => {
  saveSoon();
  clearTimeout(timer);
  timer = setTimeout(() => {
    void draw(source.value);
    history.replaceState(null, '', `${location.pathname}${location.search}#${encodeDiagram(source.value)}`);
  }, 150);
});

window.addEventListener('hashchange', () => {
  const text = fromHash();
  if (text !== null && text !== source.value) {
    library.arrived();
    source.value = text;
    editor.refresh();
    saveSoon();
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
  if (isBlank(source.value)) {
    flash('Nothing to export yet. Type a diagram first.', 'error');
    return null;
  }
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

// A QR code of a share link, so a phone can open the diagram from the screen. The encoder loads
// the first time the dialog opens.
const qrDialog = byId<HTMLDialogElement>('qr');
const qrBox = byId('qr-code');
const qrNote = byId('qr-note');
const qrDownload = byId<HTMLButtonElement>('qr-download');
let qrShown: { svg: string; size: number } | null = null;
const showQr = async (): Promise<void> => {
  const view = (document.querySelector('input[name="qr-kind"]:checked') as HTMLInputElement).value === 'view';
  const url = link(view);
  const { qrCode } = await import('./qr');
  const qr = qrCode(url);
  qrShown = qr;
  qrDownload.hidden = !qr;
  if (!qr) {
    qrBox.replaceChildren();
    qrNote.textContent = `This link is ${url.length.toLocaleString()} characters, too long for a QR code. Use Copy link instead.`;
    return;
  }
  // Markup made by qr.ts from the code's modules only.
  qrBox.innerHTML = qr.svg;
  const opens = view ? 'Opens the diagram on its own.' : 'Opens the diagram in the editor.';
  qrNote.textContent = qr.size > 100 ? `${opens} It's a dense code: hold the phone close and steady.` : opens;
};
action('qr-open', async () => {
  qrDialog.showModal();
  await showQr();
});
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="qr-kind"]')) {
  radio.addEventListener('change', () => void showQr());
}
qrDownload.addEventListener('click', async () => {
  if (!qrShown) return;
  const side = qrShown.size * 8;
  download(await svgToPng({ svg: qrShown.svg, width: side, height: side }, 1), 'siren-qr.png');
});
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
