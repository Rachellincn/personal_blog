(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.querySelector('.scroll-progress');

  const updateProgress = () => {
    if (!progress) return;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = distance > 0 ? window.scrollY / distance : 0;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
  };

  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateProgress();
      scrollFrame = 0;
    });
  }, { passive: true });
  updateProgress();

  const revealItems = document.querySelectorAll('.reveal');
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

  const canvas = document.querySelector('[data-tilt]');
  if (canvas && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let tiltFrame = 0;
    canvas.addEventListener('pointermove', (event) => {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        canvas.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
      });
    });
    canvas.addEventListener('pointerleave', () => {
      canvas.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    });
  }

  const cards = [...document.querySelectorAll('.post-card')];
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('#note-search');
  const empty = document.querySelector('.empty-state');
  const count = document.querySelector('#result-count');
  let activeFilter = 'all';

  const applyFilters = () => {
    if (!cards.length) return;
    const query = search?.value.trim().toLocaleLowerCase('zh-CN') ?? '';
    let visible = 0;
    cards.forEach((card) => {
      const tags = card.dataset.tags || '';
      const text = card.textContent.toLocaleLowerCase('zh-CN');
      const categoryMatch = activeFilter === 'all' || tags.includes(activeFilter);
      const searchMatch = !query || text.includes(query);
      card.hidden = !(categoryMatch && searchMatch);
      if (!card.hidden) visible += 1;
    });
    empty?.classList.toggle('visible', visible === 0);
    if (count) count.textContent = `${visible} ${visible === 1 ? 'note' : 'notes'}`;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      buttons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyFilters();
    });
  });
  search?.addEventListener('input', applyFilters);
  applyFilters();
})();
