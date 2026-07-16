import type { Experiment, ExperimentElements } from './core/types';

const root = document.querySelector<HTMLElement>('[data-playground]');
if (root) {
  const container = root;
  const tabs = [...container.querySelectorAll<HTMLButtonElement>('[data-experiment]')];
  const elements: ExperimentElements = {
    canvas: container.querySelector<HTMLCanvasElement>('#physics-canvas')!,
    controls: container.querySelector<HTMLElement>('#experiment-controls')!,
    actions: container.querySelector<HTMLElement>('#experiment-actions')!,
    data: container.querySelector<HTMLElement>('#physics-data')!,
    status: container.querySelector<HTMLElement>('#experiment-status')!,
    stage: container.querySelector<HTMLElement>('#experiment-stage')!,
  };
  const loaders: Record<string, () => Promise<{ default: new () => Experiment }>> = {
    projectile: () => import('./games/projectile'),
    pendulum: () => import('./games/double-pendulum'),
    wave: () => import('./games/wave-lab'),
  };
  const help: Record<string, string> = {
    projectile: 'Keyboard: Space launch/pause · R reset · N new target · Arrow keys aim',
    pendulum: 'Keyboard: focus the stage, then Space pause/resume · R restart',
    wave: 'Keyboard: focus the stage, then Space pause/resume · . single step · R reset',
  };
  let active: Experiment | null = null;
  let request = 0;

  async function select(id: string, focus = false) {
    if (!loaders[id]) return;
    const selection = ++request;
    active?.destroy(); active = null;
    elements.controls.replaceChildren(); elements.actions.replaceChildren(); elements.data.replaceChildren();
    elements.status.textContent = 'Loading instrument…';
    tabs.forEach((tab) => {
      const selected = tab.dataset.experiment === id;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    elements.stage.setAttribute('aria-labelledby', `tab-${id}`);
    localStorage.setItem('physics-playground:active', id);
    try {
      const module = await loaders[id]();
      if (selection !== request) return;
      active = new module.default();
      container.querySelector<HTMLElement>('#experiment-number')!.textContent = active.number;
      container.querySelector<HTMLElement>('#experiment-name')!.textContent = active.name;
      container.querySelector<HTMLElement>('#keyboard-help')!.textContent = help[id];
      elements.canvas.setAttribute('aria-label', active.name);
      elements.status.textContent = `${active.name} ready.`;
      active.mount(elements);
    } catch (error) {
      console.error(error);
      elements.status.textContent = 'The instrument could not start. Reload the page or try another experiment.';
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.experiment ?? 'projectile'));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[next].dataset.experiment ?? 'projectile', true);
    });
  });

  window.addEventListener('pagehide', () => active?.destroy(), { once: true });
  const requested = new URLSearchParams(location.search).get('experiment');
  const saved = localStorage.getItem('physics-playground:active');
  select(requested && loaders[requested] ? requested : saved && loaders[saved] ? saved : 'projectile');
}
