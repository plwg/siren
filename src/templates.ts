// Starting points, one per common diagram type. Short enough to read at a glance, and each shows the
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
];
