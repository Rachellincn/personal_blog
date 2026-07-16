const root = document.querySelector<HTMLElement>('[data-research-canvas]');
if (root) {
  const container = root;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || memory <= 4;
  const canvas = container.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const electrons = [...container.querySelectorAll<SVGElement>('[data-electron]')];
  const lattice = [...container.querySelectorAll<SVGCircleElement>('[data-lattice] circle')];
  const info = container.querySelector<HTMLElement>('[data-research-info]')!;
  const topics: Record<string, string> = {
    quantum: 'The time-independent Schrödinger equation connects measurable energy with the structure of a quantum state.',
    materials: 'Two-dimensional MoS₂ is a tunable semiconductor whose optical and electronic behavior changes at the atomic-layer scale.',
    ai: 'AI for Science asks how learned models can help explain, predict, and design physical systems—not only fit their data.',
  };
  const pulses: Array<{ x: number; y: number; age: number }> = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let visible = true;
  let pointer = { x: .5, y: .5 };

  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function animate() {
    frame = 0;
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, width, height);
    pulses.forEach((pulse) => {
      pulse.age += 1;
      const radius = pulse.age * 2.1;
      ctx.beginPath(); ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(49,91,115,${Math.max(0, .32 - pulse.age / 180)})`;
      ctx.lineWidth = 1.4; ctx.stroke();
    });
    for (let i = pulses.length - 1; i >= 0; i -= 1) if (pulses[i].age > 58) pulses.splice(i, 1);
    electrons.forEach((electron, index) => {
      const dx = (pointer.x - .5) * (5 + index * 2);
      const dy = (pointer.y - .5) * (4 + index);
      electron.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    if (pulses.length) frame = requestAnimationFrame(animate);
  }

  function pulse(clientX: number, clientY: number) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left; const y = clientY - rect.top;
    pulses.push({ x, y, age: 0 });
    if (pulses.length > 6) pulses.shift();
    lattice.forEach((node) => {
      const nx = Number(node.getAttribute('cx')) / 520 * width;
      const ny = Number(node.getAttribute('cy')) / 520 * height;
      const distance = Math.hypot(nx - x, ny - y);
      if (distance < width * .32) {
        node.style.setProperty('--ripple-delay', `${Math.round(distance * 1.6)}ms`);
        node.classList.remove('is-rippling');
        requestAnimationFrame(() => node.classList.add('is-rippling'));
      }
    });
    if (!frame) frame = requestAnimationFrame(animate);
  }

  container.querySelectorAll<HTMLButtonElement>('[data-research-topic]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    info.textContent = topics[button.dataset.researchTopic ?? ''] ?? '';
    info.hidden = false;
  }));

  if (!reduced && !lowPower) {
    container.addEventListener('pointermove', (event) => {
      const rect = container.getBoundingClientRect();
      pointer = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
      if (!frame) frame = requestAnimationFrame(animate);
    }, { passive: true });
    container.addEventListener('pointerdown', (event) => {
      if (!(event.target as Element).closest('button, .research-info, .canvas-caption')) pulse(event.clientX, event.clientY);
    });
    new ResizeObserver(resize).observe(container);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && pulses.length && !frame) frame = requestAnimationFrame(animate);
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    }).observe(container);
    resize();
  } else {
    container.classList.add('is-static');
  }
}
