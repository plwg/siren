import { type Mounted, type MountOptions, mount } from 'pele';
import pkg from '../package.json';
import { type DocumentReport, type DocumentView, initDocument } from './document';
import { initEditor } from './editor';
import { errorLine } from './errorline';
import { type Exported, exportSvg, svgToPng } from './export';
import { decodeLink, encodeDiagram } from './hash';
import { initLayout } from './layout';
import { initLibrary } from './library';
import { guardLinks } from './links';
import { documentTitle, firstDiagram } from './markdown';
import { exportOptions, initMenu } from './menu';
import { type EditorMode, noun } from './mode';
import { describe, IconTracker, type Omitted, omitForPage } from './omitted';
import { qrCode } from './qr';
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
const reportDocument = ({ problem, omitted }: DocumentReport): void => {
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

// Draws new text, or the empty state for blank text.
const draw = (text: string): void => {
  const blank = isBlank(text);
  showBlank(blank);
  if (blank) return;
  if (markdown()) showDocument(text);
  else showDiagram(text);
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
const saveSoon = (): void => {
  if (viewing) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // A document is kept even while one of its diagrams is broken: the prose is worth keeping.
    if (doc || (mounted && !mounted.error)) library.saved(source.value);
  }, 1000);
};
// A diagram that arrived in a link is kept too, so it can be found again.
if (arrived !== null) saveSoon();

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
draw(source.value);

// Switching modes carries the work across where it can: a diagram becomes a document holding it,
// and a document gives up its first diagram. What was there first is kept in Recent, and Back
// returns to it.
const switchMode = (next: EditorMode): void => {
  if (next === mode) return;
  const text = source.value;
  const kept = library.leaving();
  const previous = noun(mode);
  let note: string;
  let converted: string;
  if (next === 'markdown') {
    converted = isBlank(text) ? '' : `\`\`\`mermaid\n${text.trimEnd()}\n\`\`\`\n`;
    note = isBlank(text) ? 'Writing Markdown.' : 'Writing Markdown. Your diagram is now a ```mermaid block in it.';
  } else {
    const first = firstDiagram(text);
    converted = first ?? '';
    note = first === null ? 'Writing Mermaid.' : "Writing Mermaid, starting from the document's first diagram.";
  }
  if (kept && next === 'mermaid') note += ` Your ${previous} is in Recent.`;
  mode = next;
  applyMode();
  source.value = converted;
  editor.refresh();
  draw(converted);
  history.pushState(null, '', `${location.pathname}${location.search}#${fragment()}`);
  updateEditLink();
  flash(note);
};
for (const radio of modeRadios) radio.addEventListener('change', () => switchMode(radio.value as EditorMode));

let timer: ReturnType<typeof setTimeout> | undefined;
source.addEventListener('input', () => {
  saveSoon();
  clearTimeout(timer);
  timer = setTimeout(() => {
    draw(source.value);
    history.replaceState(null, '', `${location.pathname}${location.search}#${fragment()}`);
  }, 150);
});

window.addEventListener('hashchange', () => {
  const link = fromHash();
  if (link !== null && (link.text !== source.value || link.mode !== mode)) {
    library.arrived();
    if (link.mode !== mode) {
      mode = link.mode;
      applyMode();
    }
    source.value = link.text;
    editor.refresh();
    saveSoon();
    draw(link.text);
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
const pageTitle = document.title;
window.addEventListener('beforeprint', () => {
  if (markdown()) document.title = docName();
});
window.addEventListener('afterprint', () => {
  document.title = pageTitle;
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
