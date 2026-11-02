// Starting points, one per diagram type Pele draws. Short enough to read at a glance, and each shows the
// syntax that type is known for. tests/templates.test.ts checks that every one draws.

export interface Template {
  name: string;
  text: string;
}

export const TEMPLATES: Template[] = [
  {
    name: 'Flowchart',
    text: `flowchart TD
  start([Idea]) --> draft[Write a draft]
  draft --> review{Reviewed?}
  review -->|Changes| draft
  review -->|Approved| ship[Publish]
  ship -.-> share[(Share the link)]`,
  },
  {
    name: 'Sequence',
    text: `sequenceDiagram
  actor You
  participant Siren
  participant Pele
  You->>Siren: Type Mermaid
  Siren->>Pele: Render
  Pele-->>Siren: SVG
  Siren-->>You: Diagram
  Note over Siren,Pele: All in your browser`,
  },
  {
    name: 'Class',
    text: `classDiagram
  class Diagram {
    +String source
    +render() SVG
  }
  class Flowchart
  class Sequence
  Diagram <|-- Flowchart
  Diagram <|-- Sequence`,
  },
  {
    name: 'State',
    text: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review: submit
  Review --> Draft: request changes
  Review --> Published: approve
  Published --> [*]`,
  },
  {
    name: 'Entity relationship',
    text: `erDiagram
  AUTHOR ||--o{ DIAGRAM : writes
  DIAGRAM ||--|{ NODE : contains
  DIAGRAM {
    string title
    date updated
  }`,
  },
  {
    name: 'Gantt',
    text: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Design      :done,   d1, 2026-11-02, 5d
  Implement   :active, d2, after d1, 10d
  section Ship
  Test        :        d3, after d2, 4d
  Launch      :milestone, after d3, 0d`,
  },
  {
    name: 'Pie',
    text: `pie title Time spent on a diagram
  "Thinking" : 45
  "Typing" : 30
  "Moving boxes around" : 25`,
  },
  {
    name: 'Mindmap',
    text: `mindmap
  root((Siren))
    Themes
      Sail
      Deep
      Lighthouse
    Sharing
      Links
      Images
    Editor`,
  },
  {
    name: 'Timeline',
    text: `timeline
  title A diagram's day
  Morning : Sketched
  Noon : Shared for review
  Evening : Pasted into the doc`,
  },
  {
    name: 'Git graph',
    text: `gitGraph
  commit id: "start"
  branch feature
  commit id: "themes"
  commit id: "export"
  checkout main
  merge feature
  commit id: "release"`,
  },
  {
    name: 'User journey',
    text: `journey
  title Sharing a diagram
  section Draw
    Open Siren: 5: You
    Type Mermaid: 4: You
  section Share
    Copy the link: 5: You
    Open it on a phone: 4: You, Teammate`,
  },
  {
    name: 'XY chart',
    text: `xychart
  title "Diagrams drawn"
  x-axis [Mon, Tue, Wed, Thu, Fri]
  y-axis "Diagrams" 0 --> 12
  bar [3, 7, 5, 10, 8]
  line [3, 7, 5, 10, 8]`,
  },
  {
    name: 'Quadrant chart',
    text: `quadrantChart
  title Diagram ideas
  x-axis Low effort --> High effort
  y-axis Low value --> High value
  quadrant-1 Plan
  quadrant-2 Do now
  quadrant-3 Skip
  quadrant-4 Maybe later
  Flowchart: [0.2, 0.8]
  Architecture: [0.7, 0.75]
  Pie chart: [0.15, 0.3]
  Wardley map: [0.8, 0.35]`,
  },
  {
    name: 'Requirement',
    text: `requirementDiagram
  requirement share_req {
    id: 1
    text: Diagrams can be shared by link.
    risk: low
    verifymethod: test
  }
  functionalRequirement offline_req {
    id: 1.1
    text: Links open without a server.
    risk: medium
    verifymethod: demonstration
  }
  element url_hash {
    type: feature
  }
  share_req - contains -> offline_req
  url_hash - satisfies -> offline_req`,
  },
  {
    name: 'C4',
    text: `C4Context
  title Siren in context
  Person(you, "You", "Writes diagrams")
  System(siren, "Siren", "Mermaid editor in the browser")
  System_Ext(pages, "GitHub Pages", "Serves the static site")
  Rel(you, siren, "Types Mermaid into")
  Rel(siren, pages, "Loaded from", "HTTPS")`,
  },
  {
    name: 'Sankey',
    text: `sankey

Visitors,Editor,60
Visitors,View link,40
Editor,Copied link,35
Editor,Exported image,25
View link,Edit in Siren,10`,
  },
  {
    name: 'Block',
    text: `block
  columns 3
  editor["Editor"] arrow<["&nbsp;"]>(right) diagram["Diagram"]
  space:2 export[("Export")]
  diagram --> export`,
  },
  {
    name: 'Packet',
    text: `packet
  title UDP header
  0-15: "Source port"
  16-31: "Destination port"
  32-47: "Length"
  48-63: "Checksum"
  64-95: "Data (variable length)"`,
  },
  {
    name: 'Kanban',
    text: `kanban
  todo[To do]
    t1[Add a diagram type]
  doing[In progress]
    t2[Write the example]@{ priority: 'High' }
  done[Done]
    t3[Ship themes]`,
  },
  {
    name: 'Architecture',
    text: `architecture-beta
  group browser(cloud)[Browser]
  service editor(server)[Editor] in browser
  service renderer(server)[Pele] in browser
  service storage(disk)[Local storage] in browser
  service pages(internet)[GitHub Pages]
  pages:R --> L:editor
  editor:R --> L:renderer
  editor:B --> T:storage`,
  },
  {
    name: 'Radar',
    text: `radar-beta
  title Diagram tools
  axis speed["Speed"], privacy["Privacy"], offline["Offline"], sharing["Sharing"]
  curve siren["Siren"]{5, 5, 5, 4}
  curve desktop["Desktop app"]{3, 4, 5, 2}
  max 5`,
  },
  {
    name: 'Treemap',
    text: `treemap-beta
"Page"
  "Renderer"
    "Parsers": 40
    "Layout": 30
  "Editor": 20
  "Fonts": 10`,
  },
  {
    name: 'Agent flow',
    text: `agentflow-beta TB
  flow input["Input"]
    source["Mermaid source"]@{ shape: input }
  end
  flow render["Render"]
    parse["Parse"]@{ shape: task }
    layout["Lay out"]@{ shape: task }
    parse --> layout
  end
  flow output["Output"]
    svg["Draw SVG"]@{ shape: action }
  end
  source --> parse
  layout --> svg`,
  },
  {
    name: 'Use case',
    text: `usecase-beta
direction LR
actor Author
actor Reader
systemBoundary Siren
  Write("Write a diagram")
  Share("Share a link")
  View("View a diagram")
end
Author --> Write
Author --> Share
Reader --> View
Share ..> : include View`,
  },
  {
    name: 'Railroad',
    text: `railroad-ebnf-beta
title "Flowchart edge"

edge = node arrow node ;
arrow = "-->" | "-.->" | "==>" ;
node = id [ "[" label "]" ] ;`,
  },
  {
    name: 'Tree view',
    text: `treeView-beta
  siren/
    src/
      main.ts ## entry point
      templates.ts ## examples
    tests/
    index.html
    package.json`,
  },
  {
    name: 'Venn',
    text: `venn-beta
  title A good diagram
  set Clear
  set Accurate
  set Short
  union Clear,Accurate["Useful"]
  union Clear,Accurate,Short["Shared"]`,
  },
  {
    name: 'Cynefin',
    text: `cynefin-beta
  title Diagram problems
  clear
    "Typo in a label"
  complicated
    "Layout looks odd"
  complex
    "Explaining the system"
  chaotic
    "Demo in five minutes"
  chaotic --> complex : "Sketch first"
  complex --> complicated : "Pattern found"`,
  },
  {
    name: 'Wardley map',
    text: `wardley-beta
title Sharing a diagram

anchor Reader [0.95, 0.6]
component Diagram link [0.8, 0.55]
component Siren [0.6, 0.45]
component Pele [0.4, 0.5]
component Browser [0.2, 0.9]

Reader -> Diagram link
Diagram link -> Siren
Siren -> Pele
Siren -> Browser

evolve Siren 0.7`,
  },
  {
    name: 'Swimlane',
    text: `swimlane-beta LR
  subgraph Author
    write[Write diagram]
    send[Send link]
  end
  subgraph Reader
    open[Open link]
    edit[Edit in Siren]
  end
  write --> send --> open
  open -->|Has changes| edit`,
  },
  {
    name: 'Ishikawa',
    text: `ishikawa-beta
  Diagram won't render
  Syntax
    Missing arrow
    Unclosed bracket
  Type
    Misspelled keyword
  Content
    Too many nodes`,
  },
  {
    name: 'Event modeling',
    text: `eventmodeling

timeframe 01 ui Editor
timeframe 02 command SaveDiagram
timeframe 03 event DiagramSaved
timeframe 04 processor RecentList`,
  },
];
