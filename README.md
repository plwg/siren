# Siren

Render Mermaid diagrams, and Markdown documents with Mermaid diagrams in them, in the browser with [Pele](https://github.com/obsidianmd/pele).

Live at https://plwg.github.io/siren/

<img alt="Siren in Lighthouse, the high-contrast theme: Mermaid source on the left, the rendered flowchart on the right" src="docs/screenshots/desktop-contrast.png">

**Lighthouse**, the high-contrast theme: pure black and white with a single signal yellow, heavier strokes and strong focus rings. **Auto** picks it when your system asks for more contrast.

<table>
  <tr>
    <td valign="top"><img alt="Shallows light theme" src="docs/screenshots/desktop-light.png" width="400"></td>
    <td valign="top"><img alt="Deep dark theme" src="docs/screenshots/desktop-dark.png" width="400"></td>
  </tr>
  <tr>
    <td>Shallows (light)</td>
    <td>Deep (dark)</td>
  </tr>
</table>

- Click **Siren** in the header for a blank editor; Back returns to the previous diagram.
- Type Mermaid on the left; the diagram renders on the right. The editor numbers lines, marks the line with an error, and strips the fences from a pasted ```` ```mermaid ```` block.
- Two modes, switched beside the name (in the ☰ menu on phones): **Mermaid** for one diagram, and **Markdown** for a GitHub-flavored Markdown document in which each ```` ```mermaid ```` block is drawn as a diagram. Each mode keeps its own text: switching shows the other mode's text and changes neither, and after a reload the mode not in the link picks up what you last wrote in it. Back undoes a switch. The link carries the mode (`#d.` for a diagram, `#m.` for a document), so older links still open as diagrams.
- In a document, a broken diagram shows its error in place and the editor marks its line. Only diagrams that changed are drawn again, so long documents stay quick to edit. A pasted ```` ```mermaid ```` block keeps its fences in Markdown mode.
- On wider screens, drag the divider between the editor and the diagram to resize them (arrow keys work when it's focused; double-click resets).
- On phones, **Code** and **Diagram** (or **Document**) tabs show one at a time at full height; the theme switcher and credits move into the ☰ menu.
- The diagram or document is saved in the URL, compressed, so a link always carries it. Prose compresses to about six link characters per ten typed, so a long document makes a long link; Siren reads links of up to 200 KB of text.
- Once the page has loaded, Siren needs no network: every diagram type, the QR code and exports are in the page, so it keeps working offline.
- The ☰ menu shows what suits the mode. Its **Diagrams** or **Documents** section starts you from an example (flowchart, sequence, class, state, ER, Gantt, pie, mindmap, timeline, git graph; or release notes and a project plan) and lists your recent work in that mode, kept only in this browser.
- Themes: **Shallows** (light), **Deep** (dark), **Lighthouse** (high contrast), or **Auto** to follow the system. Add `?theme=light|dark|contrast` to a link to force one.
- The ☰ menu holds sharing and export:
  - **QR code** shows a scannable code of the view or editor link, to open the diagram on a phone; it can be downloaded as a PNG.
  - **Copy link** opens the editor with the diagram; **Copy view link** shows only the diagram, in the theme you picked, with an **Edit in Siren** button to open it in the editor.
  - **Copy image** puts a PNG on the clipboard to paste into documents; **SVG** and **PNG** download files.
  - In Markdown mode, **PDF** opens the browser's print dialog (choose Save as PDF): only the document, in light colors whatever the theme, named after its first heading. **Markdown file** downloads the text as `.md`, and **Open Markdown file…** (under Documents) opens one from your device, keeping the current document in Recent.
  - Exports ignore the editor theme. Choose **Sea** or **Neutral** colors, **Light** or **Dark**, and a **Clear** or **Solid** background. Text is set in Arial so it fits in any document app.

## Security

Anyone can craft a Siren link, so diagrams are treated as untrusted:

- [Pele](https://pele.run/security) draws labels as text, drops `click` callbacks, and blocks `javascript:` and `data:` links.
- A Content Security Policy lets only Siren's own scripts run and blocks loading anything from other sites. `bun run build` fails if the inline theme script and its hash in the policy drift apart; `bun scripts/check-csp.ts --write` updates the hash.
- Markdown is rendered by [Marked](https://marked.js.org) with raw HTML shown as text, links kept only for `http`, `https`, `mailto` and `tel`, and images replaced by a placeholder naming them.
- Diagram images are not loaded, so a shared link can't track who views it. Each shows as a dashed placeholder, and a warning says so. Icons (such as `fa:fa-car`) aren't bundled; the warning names them.
- Diagram links are drawn in the accent color with underlined labels, ask before opening, and show where they really go. Exports contain no links or images.
- Fonts are self-hosted, so viewing Siren sends nothing to a font host. The diagram itself lives after the `#` in the URL and is never sent to any server.
- GitHub Actions are pinned to commit hashes, and Dependabot proposes updates.

Siren runs on `plwg.github.io`, which it shares with any other GitHub Pages sites under that account. It stores only theme and export preferences.

## Develop

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # local dev server
bun run typecheck
bun run lint       # Biome: lint and formatting check
bun run format     # Biome: fix formatting and import order
bun run check      # lint, typecheck, test and build: run before committing
bun run screenshots  # rebuild the README screenshots, link-preview image and touch icon
                     # (first: bunx playwright-core install chromium)
bun run build      # outputs to dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/pages.yml`.

## License

[MIT](LICENSE). Pele, the fonts and other dependencies keep their own licenses.
