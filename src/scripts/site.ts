const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress = document.querySelector<HTMLElement>('.scroll-progress');
let scrollFrame = 0;

function updateProgress() {
  if (!progress) return;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
}

window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { updateProgress(); scrollFrame = 0; });
}, { passive: true });
updateProgress();

const revealItems = document.querySelectorAll<HTMLElement>('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach((item) => observer.observe(item));
}

const menu = document.querySelector<HTMLButtonElement>('.nav-hamburger');
const nav = document.querySelector<HTMLElement>('#main-nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('is-open', open);
});

const cards = [...document.querySelectorAll<HTMLElement>('.post-card')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const search = document.querySelector<HTMLInputElement>('#note-search');
const empty = document.querySelector<HTMLElement>('.empty-state');
const count = document.querySelector<HTMLElement>('#result-count');
let activeFilter = 'all';

function applyFilters() {
  if (!cards.length) return;
  const query = search?.value.trim().toLocaleLowerCase('zh-CN') ?? '';
  let visible = 0;
  cards.forEach((card) => {
    const categoryMatch = activeFilter === 'all' || (card.dataset.tags ?? '').includes(activeFilter);
    const searchMatch = !query || (card.textContent ?? '').toLocaleLowerCase('zh-CN').includes(query);
    card.hidden = !(categoryMatch && searchMatch);
    if (!card.hidden) visible += 1;
  });
  empty?.classList.toggle('visible', visible === 0);
  if (count) count.textContent = `${visible} ${visible === 1 ? 'note' : 'notes'}`;
}

filters.forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter ?? 'all';
  filters.forEach((item) => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  applyFilters();
}));
search?.addEventListener('input', applyFilters);
applyFilters();
