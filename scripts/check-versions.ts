// Checks that the footer's Mermaid version matches the one the installed Pele targets. The footer
// is plain HTML, so an upgrade of Pele (say, from Dependabot) fails the build here rather than
// leaving the footer out of date.

const readme = await Bun.file('node_modules/pele/README.md').text();
const html = await Bun.file('index.html').text();

const targeted = readme.match(/Pele targets Mermaid (\d+\.\d+\.\d+)/)?.[1];
const shown = html.match(/Supports Mermaid (\d+\.\d+\.\d+) syntax/)?.[1];

if (!targeted || !shown) {
  console.error(`Couldn't find the Mermaid version in ${targeted ? 'index.html' : "Pele's README"}.`);
  process.exit(1);
}
if (targeted !== shown) {
  console.error(`The footer says Mermaid ${shown}, but the installed Pele targets Mermaid ${targeted}.`);
  console.error('Update "Supports Mermaid … syntax" in index.html.');
  process.exit(1);
}
console.log(`Footer and Pele agree on Mermaid ${targeted}`);
