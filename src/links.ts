// Diagrams can carry `click … href` links, and anyone can craft a Siren link, so a diagram's links
// are the diagram author's, not Siren's. Before following one, show where it really goes.
//
// Links within a document, such as footnotes, scroll to their target instead. They never reach
// the address bar: the part after # holds the document itself.

export function guardLinks(diagram: HTMLElement): void {
  const dialog = document.getElementById('leave') as HTMLDialogElement;
  const host = document.getElementById('leave-host') as HTMLElement;
  const full = document.getElementById('leave-url') as HTMLElement;
  let pending: URL | null = null;

  const intercept = (event: MouseEvent): void => {
    const anchor = (event.target as Element).closest('a');
    if (!anchor || !diagram.contains(anchor)) return;
    event.preventDefault();
    const href = anchor.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (event.type === 'click' && target && diagram.contains(target)) {
        // Only the preview scrolls: scrollIntoView would move the page too.
        const offset = target.getBoundingClientRect().top - diagram.getBoundingClientRect().top;
        diagram.scrollBy({ top: offset - diagram.clientHeight / 3, behavior: 'smooth' });
        target.classList.add('md-target');
        setTimeout(() => target.classList.remove('md-target'), 1600);
      }
      return;
    }
    try {
      pending = new URL(href, location.href);
    } catch {
      return;
    }
    // The hostname shows punycode (xn--…) for look-alike domains, which is the point.
    host.textContent =
      pending.protocol === 'mailto:' || pending.protocol === 'tel:' ? pending.protocol.slice(0, -1) : pending.hostname;
    full.textContent = pending.href;
    dialog.returnValue = '';
    dialog.showModal();
  };
  diagram.addEventListener('click', intercept);
  // Middle-click would otherwise open the link in a new tab without asking.
  diagram.addEventListener('auxclick', intercept);

  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'open' && pending) window.open(pending.href, '_blank', 'noopener,noreferrer');
    pending = null;
  });
}
