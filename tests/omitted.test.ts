import { expect, describe as group, test } from 'bun:test';
import { render } from 'pele/lazy';
import { ready } from '../src/engine';
import { describe, IconTracker, omitForFile } from '../src/omitted';

// Draws the text and passes the result on as Siren does, with the icon names Pele asked for.
const omit = async (text: string) => {
  await ready(text);
  const icons = new IconTracker();
  const { svg } = render(text, { icons: icons.resolve });
  return { drawn: svg, ...omitForFile(svg, icons.take()) };
};

group('images', () => {
  test('each image becomes a dashed box of the same size, and nothing remote remains', async () => {
    const {
      drawn,
      svg: out,
      omitted,
    } = await omit(
      'flowchart LR\n  A@{ img: "https://example.org/a.png", label: "A", w: 60, h: 40 }\n  B@{ img: "/b.png", label: "B", w: 30, h: 30 } --> A',
    );
    expect(drawn).toContain('<image');
    expect(omitted.images).toBe(2);
    expect(out).not.toContain('<image');
    expect(out).not.toContain('example.org');
    expect(out).not.toContain('/b.png');
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    const boxes = [...doc.querySelectorAll('g.siren-omitted > rect')];
    expect(boxes.map((r) => [r.getAttribute('width'), r.getAttribute('height')])).toEqual(
      expect.arrayContaining([
        ['60', '40'],
        ['30', '30'],
      ]),
    );
  });

  test('a diagram without images is unchanged apart from serialization', async () => {
    const { omitted } = await omit('flowchart LR\n  A --> B');
    expect(omitted).toEqual({ images: 0, icons: [] });
  });
});

group('icons', () => {
  test('icons with no drawing are named, and those with a slot get a placeholder', async () => {
    const { svg, omitted } = await omit(
      'flowchart LR\n  A[fa:fa-car Car] --> B["fab:fa-github Repo"]\n  C@{ icon: "fa:user", label: "User" }',
    );
    expect(omitted.icons).toEqual(['fa:fa-car', 'fab:fa-github', 'fa:user']);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    for (const slot of doc.querySelectorAll('svg.pele-icon')) expect(slot.querySelector('rect')).not.toBeNull();
  });

  test("icons Pele draws itself aren't reported", async () => {
    const { omitted } = await omit(
      'architecture-beta\n  group api(cloud)[API]\n  service db(database)[Database] in api\n  service s(logos:aws-s3)[S3] in api',
    );
    expect(omitted.icons).toEqual(['logos:aws-s3']);
  });
});

group('warning', () => {
  test('nothing left out says nothing', () => {
    expect(describe({ images: 0, icons: [] })).toBeNull();
  });

  test('images, singular and plural', () => {
    expect(describe({ images: 1, icons: [] })).toStartWith('This diagram has an image.');
    expect(describe({ images: 3, icons: [] })).toStartWith('This diagram has 3 images.');
  });

  test('icons are named, without repeats, and summarized past two', () => {
    expect(describe({ images: 0, icons: ['fa:fa-car'] })).toBe("Siren has no icon set, so fa:fa-car isn't drawn.");
    expect(describe({ images: 0, icons: ['fa:a', 'fa:a', 'fa:b'] })).toBe(
      "Siren has no icon set, so fa:a and fa:b aren't drawn.",
    );
    expect(describe({ images: 0, icons: ['a', 'b', 'c', 'd'] })).toBe(
      "Siren has no icon set, so a, b and 2 more aren't drawn.",
    );
  });

  test('both are reported', () => {
    expect(describe({ images: 1, icons: ['fa:x'] })).toBe(
      "This diagram has an image. Siren doesn't show images, so a shared link can't track who views it. Siren has no icon set, so fa:x isn't drawn.",
    );
  });
});
