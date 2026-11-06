import { type Mounted, type MountOptions, mount } from 'pele/lazy';
import { everyLoaded, loadRest, loadTypes, missing } from './diagrams';
import { type DocumentReport, type DocumentView, initDocument } from './document';
import { initEditor, replaceText } from './editor';
import { errorLine } from './errorline';
import { type Exported, exportSvg, svgToPng } from './export';
import { decodeLink, encodeDiagram } from './hash';
import { highlighter, loadHighlighter } from './highlight';
import { initLayout } from './layout';
import { initLibrary } from './library';
import { guardLinks } from './links';
import { documentTitle, renderMarkdown } from './markdown';
import { exportOptions, initMenu } from './menu';
import { type EditorMode, noun } from './mode';
import { describe, IconTracker, type Omitted, omitForPage } from './omitted';
import { qrCode } from './qr';
import { initScrollSync } from './scrollsync';
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

const fromHash = (): { text: string; mode: EditorMode } | null => decodeLink(location.hash.slice(1));

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

if (new URLSearchParams(location.search).has('view')) document.body.classList.add('view');
initThemes();
initLayout();
initSplit();
const menu = initMenu();

const source = byId<HTMLTextAreaElement>('source');
const diagram = byId('diagram');
const arrived = fromHash();
source.value = arrived?.text ?? DEFAULT;
// Mermaid draws the whole text as one diagram; Markdown draws a document with ```mermaid blocks.
let mode: EditorMode = arrived?.mode ?? 'mermaid';
const markdown = (): boolean => mode === 'markdown';
const editor = initEditor(source, byId('code'), () => !markdown());
// A Markdown document scrolls with its source; a diagram pans and zooms on its own.
const scrollSync = initScrollSync(
  source,
  byId('code'),
  diagram,
  () => markdown() && !diagram.classList.contains('blank') && !document.body.classList.contains('view'),
);

// An empty editor isn't an error: the diagram pane says how to start instead.
const isBlank = (text: string): boolean => text.trim() === '';
const showBlank = (blank: boolean): void => {
  diagram.classList.toggle('blank', blank);
  if (blank) {
    editor.setErrorLine(null);
    setStanding(null);
  }
};

// Images and icons Siren leaves out are swapped for placeholders before the drawing reaches the
// page (see omitted.ts), and named in a warning.
let omitted: Omitted = { images: 0, icons: [] };
const icons = new IconTracker();
const diagramOptions: MountOptions = {
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
};

// A Markdown document reports its first broken diagram, marking the line in the editor.
// Diagrams change the document's height as they draw, so the panes line up again after each report.
const reportDocument = ({ problem, omitted }: DocumentReport): void => {
  scrollSync.realign();
  if (problem) {
    const line = problem.line === null ? null : errorLine(blockText(problem.line), problem.error);
    editor.setErrorLine(line === null || problem.line === null ? null : problem.line + line - 1);
    const message = problem.error instanceof Error ? problem.error.message : String(problem.error);
    setStanding(`Diagram ${problem.index}: ${message}`);
  } else {
    editor.setErrorLine(null);
    setStanding(describe(omitted, 'document'), 'warning');
  }
};
// The source from a diagram's first line on; errorLine finds the line within it.
const blockText = (line: number): string =>
  source.value
    .split('\n')
    .slice(line - 1)
    .join('\n');

guardLinks(diagram);

// The diagram pane shows a Mermaid diagram, or a Markdown document with diagrams in it. Only one
// exists at a time; switching modes drops the other.
let mounted: Mounted | null = null;
let doc: DocumentView | null = null;
const showDiagram = (text: string): void => {
  if (doc) {
    doc.destroy();
    doc = null;
    diagram.replaceChildren();
  }
  if (mounted) mounted.update(text);
  else mounted = mount(diagram, text, diagramOptions);
};
const showDocument = (text: string): void => {
  if (mounted) {
    mounted.destroy();
    mounted = null;
    diagram.replaceChildren();
  }
  doc ??= initDocument(diagram, reportDocument);
  doc.update(text);
};

// Draws new text, or the empty state for blank text. A diagram type whose code hasn't arrived is
// fetched first (see diagrams.ts), and so is the highlighter for a document with code in it (see
// highlight.ts); if newer text is drawn meanwhile, this one is dropped. Code shows plain if the
// highlighter can't be fetched.
let drawing = 0;
const draw = async (text: string): Promise<void> => {
  const turn = ++drawing;
  const blank = isBlank(text);
  let failed: string[] = [];
  if (!blank && (!everyLoaded() || (markdown() && !highlighter()))) {
    const rendered = markdown() ? renderMarkdown(text) : null;
    const types = everyLoaded() ? [] : missing(rendered ? rendered.blocks.map((block) => block.text) : [text]);
    const [unloaded] = await Promise.all([
      types.length ? loadTypes(types) : [],
      rendered?.code && !highlighter() ? loadHighlighter() : true,
    ]);
    failed = unloaded;
    if (turn !== drawing) return;
  }
  showBlank(blank);
  if (blank) return;
  if (markdown()) showDocument(text);
  else showDiagram(text);
  // Pele would call the type unsupported; the real trouble is the connection.
  if (failed.length)
    setStanding(
      `Couldn't fetch the code for ${failed.join(' and ')} diagrams. Check the connection, then edit to try again.`,
    );
};

// Pele measures labels in the page's fonts, so draw again once the web fonts arrive.
void document.fonts.ready.then(() => {
  mounted?.refresh();
  doc?.refresh();
});

// Recent diagrams: kept a moment after edits settle, if the diagram draws. Not on view pages.
const viewing = document.body.classList.contains('view');
const library = initLibrary(
  source,
  [DEFAULT],
  () => mode,
  (message) => flash(message),
);
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const saveNow = (): void => {
  clearTimeout(saveTimer);
  // A document is kept even while one of its diagrams is broken: the prose is worth keeping.
  if (!viewing && (doc || (mounted && !mounted.error))) library.saved(source.value);
};
const saveSoon = (): void => {
  if (viewing) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1000);
};
// A diagram that arrived in a link is kept too, so it can be found again.
if (arrived !== null) saveSoon();

// Each mode keeps its own text: switching shows the other mode's text and changes neither. The
// mode not in the link starts from what was last kept in it, so both survive a reload; a diagram
// otherwise starts from the sample, and a document empty.
const texts: Record<EditorMode, string> = { mermaid: DEFAULT, markdown: '' };
if (!viewing) {
  for (const other of ['mermaid', 'markdown'] as const) {
    if (other !== mode) texts[other] = library.resume(other) ?? texts[other];
  }
}

const fragment = (): string => encodeDiagram(source.value, mode);

// Everything that names the mode: the switch, the menu (CSS shows each mode's part), the words.
const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="editor-mode"]');
const newLink = byId<HTMLAnchorElement>('new-diagram');
const applyMode = (): void => {
  document.body.dataset.mode = mode;
  for (const radio of modeRadios) radio.checked = radio.value === mode;
  const what = noun(mode);
  const language = markdown() ? 'Markdown' : 'Mermaid';
  source.setAttribute('aria-label', `${language} source`);
  byId('pane-diagram-label').textContent = markdown() ? 'Document' : 'Diagram';
  byId('recent-heading').textContent = markdown() ? 'Documents' : 'Diagrams';
  newLink.href = `./#${encodeDiagram('', mode)}`;
  newLink.title = `New blank ${what}`;
  if (viewing) {
    diagram.dataset.empty = `This link has no ${what}.`;
    diagram.dataset.emptyNarrow = diagram.dataset.empty;
  } else {
    diagram.dataset.empty = `Type ${language} on the left, or start from an example in the ☰ menu.`;
    diagram.dataset.emptyNarrow = `Type ${language} in the Code tab, or start from an example in the ☰ menu.`;
  }
  library.modeChanged();
};
applyMode();
// The rest of the diagram types, and the highlighter, are fetched after the first drawing, so they
// don't delay it.
void draw(source.value).then(() => {
  loadRest();
  const fetchHighlighter = (): void => void loadHighlighter();
  if ('requestIdleCallback' in window) requestIdleCallback(fetchHighlighter, { timeout: 2000 });
  else setTimeout(fetchHighlighter, 200);
});

// Shows another mode, with the text it had. Back returns to the mode before.
const switchMode = (next: EditorMode): void => {
  if (next === mode) return;
  saveNow();
  texts[mode] = source.value;
  mode = next;
  applyMode();
  source.value = texts[mode];
  editor.refresh();
  void draw(source.value);
  history.pushState(null, '', `${location.pathname}${location.search}#${fragment()}`);
  updateEditLink();
};
for (const radio of modeRadios) radio.addEventListener('change', () => switchMode(radio.value as EditorMode));

let timer: ReturnType<typeof setTimeout> | undefined;
source.addEventListener('input', () => {
  saveSoon();
  clearTimeout(timer);
  timer = setTimeout(() => {
    void draw(source.value);
    history.replaceState(null, '', `${location.pathname}${location.search}#${fragment()}`);
  }, 150);
});

window.addEventListener('hashchange', () => {
  const link = fromHash();
  if (link !== null && (link.text !== source.value || link.mode !== mode)) {
    if (link.mode !== mode) {
      saveNow();
      texts[mode] = source.value;
      mode = link.mode;
      applyMode();
    }
    // Back to a mode's own text (after a switch) continues its entry; anything else is new.
    if (link.text !== texts[mode]) library.arrived();
    source.value = link.text;
    editor.refresh();
    saveSoon();
    void draw(link.text);
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
  return `${location.origin}${location.pathname}${query}#${fragment()}`;
};
const copy = async (text: string, label: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    flash(`${label} copied`);
  } catch {
    flash(`Couldn't copy the ${label.toLowerCase()}. Copy it from the address bar instead.`, 'error');
  }
};

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
  try {
    return await exportSvg(source.value, exportOptions());
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
byId('open-view').addEventListener('click', () => window.open(link(true), '_blank', 'noopener'));

// A QR code of a share link, so a phone can open the diagram from the screen.
const qrDialog = byId<HTMLDialogElement>('qr');
const qrBox = byId('qr-code');
const qrNote = byId('qr-note');
const qrDownload = byId<HTMLButtonElement>('qr-download');
let qrShown: { svg: string; size: number } | null = null;
const showQr = async (): Promise<void> => {
  const view = (document.querySelector('input[name="qr-kind"]:checked') as HTMLInputElement).value === 'view';
  const url = link(view);
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
  const what = noun(mode);
  const opens = view ? `Opens the ${what} on its own.` : `Opens the ${what} in the editor.`;
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
// Documents export as PDF through the browser's print dialog, which keeps text selectable and
// diagrams sharp; print styles in index.html show only the document, in light colors. The PDF is
// named after the document's heading, which browsers take from the page title.
const docName = (): string => documentTitle(source.value) || 'Document';
action('print-pdf', () => {
  if (isBlank(source.value)) {
    flash('Nothing to export yet. Write the document first.', 'error');
    return;
  }
  window.print();
});
// Collapsed sections print open, so the PDF holds the whole document; they close again after.
const pageTitle = document.title;
let openedForPrint: HTMLDetailsElement[] = [];
window.addEventListener('beforeprint', () => {
  if (!markdown()) return;
  document.title = docName();
  openedForPrint = [...document.querySelectorAll<HTMLDetailsElement>('.doc details:not([open])')];
  for (const section of openedForPrint) section.open = true;
});
window.addEventListener('afterprint', () => {
  document.title = pageTitle;
  for (const section of openedForPrint) section.open = false;
  openedForPrint = [];
});
// Opens a Markdown file from this device as a new document: the one in the editor is kept in
// Recent, and Undo brings it back. The file is read here and goes nowhere else.
const MAX_FILE = 200_000;
const filePicker = byId<HTMLInputElement>('open-file-input');
action('open-file', () => filePicker.click());
filePicker.addEventListener('change', async () => {
  const file = filePicker.files?.[0];
  filePicker.value = '';
  if (!file) return;
  if (file.size > MAX_FILE) {
    flash(`${file.name} is too large. Siren opens files up to 200 KB.`, 'error');
    return;
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    flash(`${file.name} isn't a text file Siren can read.`, 'error');
    return;
  }
  const kept = library.opening();
  replaceText(source, text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
  flash(`Opened ${file.name}.${kept ? ' Your previous document is in Recent.' : ''}`);
});
action('download-md', () => {
  const file = docName()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  download(new Blob([source.value], { type: 'text/markdown;charset=utf-8' }), `${file || 'document'}.md`);
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
