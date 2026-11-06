import { type DiagramType, detectType, load, registered } from 'pele/lazy';

// Each Mermaid diagram type's code is fetched only when needed, so the first diagram draws without
// waiting for the other thirty-odd types. The rest are fetched once the page is idle, so Siren
// still has every type and works offline once it has settled.

// Every type Pele draws. Typechecking fails if Pele adds one that isn't listed here.
const ALL = [
  'flowchart',
  'sequence',
  'class',
  'state',
  'er',
  'pie',
  'gantt',
  'gitGraph',
  'mindmap',
  'timeline',
  'journey',
  'xychart',
  'quadrantChart',
  'requirement',
  'c4',
  'sankey',
  'block',
  'packet',
  'kanban',
  'architecture',
  'radar',
  'treemap',
  'info',
  'agentflow',
  'usecase',
  'railroad',
  'treeView',
  'venn',
  'cynefin',
  'wardley',
  'swimlane',
  'ishikawa',
  'eventmodeling',
] as const satisfies readonly DiagramType[];
type Missing = Exclude<DiagramType, (typeof ALL)[number]>;
const everyType: [Missing] extends [never] ? true : Missing = true;
void everyType;

const typeOf = (text: string): DiagramType | null => {
  try {
    return detectType(text);
  } catch {
    return null;
  }
};

/** Whether every type's code has arrived. */
export const everyLoaded = (): boolean => ALL.every(registered);

/** The types among these diagrams' texts whose code hasn't arrived yet. */
export function missing(texts: readonly string[]): DiagramType[] {
  const types = new Set<DiagramType>();
  for (const text of texts) {
    const type = typeOf(text);
    if (type !== null && !registered(type)) types.add(type);
  }
  return [...types];
}

/**
 * Fetches the code for these types, and returns those it couldn't fetch (offline before they
 * arrived). A later call tries those again.
 */
export async function loadTypes(types: readonly DiagramType[]): Promise<DiagramType[]> {
  const loaded = await Promise.all(types.map((type) => load(type).catch(() => false)));
  return types.filter((_, i) => !loaded[i]);
}

/** Fetches every remaining type once the page is idle. */
export function loadRest(): void {
  const run = (): void => void loadTypes(ALL.filter((type) => !registered(type)));
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 200);
}
