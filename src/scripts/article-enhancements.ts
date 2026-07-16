import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';

const article = document.querySelector<HTMLElement>('.note-content, .article-body, .post-content');
if (article) {
  renderMathInElement(article, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });

  const used = new Set<string>();
  const headings = [...article.querySelectorAll<HTMLElement>('h2, h3')];
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = uniqueSlug(heading.textContent ?? `section-${index + 1}`, used);
    heading.tabIndex = -1;
    if (heading.querySelector('.heading-anchor')) return;
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to ${heading.textContent ?? 'section'}`);
    anchor.textContent = '#';
    heading.append(anchor);
  });

  article.querySelectorAll<HTMLElement>('.katex-display, pre').forEach((block) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-snippet';
    button.textContent = block.matches('pre') ? 'Copy code' : 'Copy formula';
    button.addEventListener('click', async () => {
      const source = block.querySelector<HTMLElement>('annotation')?.textContent ?? block.textContent ?? '';
      await navigator.clipboard.writeText(source.trim());
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = block.matches('pre') ? 'Copy code' : 'Copy formula'; }, 1400);
    });
    block.classList.add('copyable-snippet');
    block.append(button);
  });
}

function uniqueSlug(text: string, used: Set<string>) {
  const base = text.normalize('NFKC').trim().toLocaleLowerCase('zh-CN')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'section';
  let value = base;
  let index = 2;
  while (document.getElementById(value) || used.has(value)) value = `${base}-${index++}`;
  used.add(value);
  return value;
}
