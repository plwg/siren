// Lets the editor fetch the flowchart code alongside its own script. Each diagram type's code is
// split out and fetched on demand (src/diagrams.ts), but the chunks import further chunks, so
// without a hint the browser discovers them in rounds after the script has run. Flowcharts are
// the sample diagram and the commonest type, so their chunks are named up front; on slow 4G this
// draws the first diagram about 0.4 s sooner. Other types still load on demand.
//
//   bun scripts/preload-flowchart.ts    after bun build --metafile=dist/meta.json

import { rmSync } from 'node:fs';

const META = 'dist/meta.json';
const PAGE = 'dist/index.html';

interface Output {
  imports?: { path: string; kind: string }[];
  exports?: string[];
  entryPoint?: string;
}
const { outputs } = (await Bun.file(META).json()) as { outputs: Record<string, Output> };
rmSync(META);

const key = (path: string): string => path.replace(/^\.\//, '');
const byPath = new Map(Object.entries(outputs).map(([path, output]) => [key(path), output]));
const start = [...byPath].find(
  ([, output]) => output.entryPoint?.includes('node_modules/pele/') && output.exports?.includes('flowchart'),
)?.[0];
if (!start) throw new Error(`${META}: no chunk exports Pele's flowchart`);

// The chunk and every chunk it imports, directly or not.
const chunks = new Set<string>();
const visit = (path: string): void => {
  if (chunks.has(path)) return;
  chunks.add(path);
  for (const { path: next, kind } of byPath.get(path)?.imports ?? []) {
    if (kind === 'import-statement') visit(key(next));
  }
};
visit(start);

const html = await Bun.file(PAGE).text();
if (!html.includes('</head>')) throw new Error(`${PAGE}: no </head>`);
const links = [...chunks].map((path) => `<link rel="modulepreload" crossorigin href="./${path}">`).join('');
await Bun.write(PAGE, html.replace('</head>', `${links}</head>`));
console.log(`${PAGE}: preloads ${chunks.size} flowchart chunk(s)`);
