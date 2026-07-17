import { updateDetails } from './core/ui';
import type { Experiment, ExperimentElements } from './core/types';

type ExperimentModule = { default: new () => Experiment };
type CatalogEntry = { id: string; shortName: string; number: string; category: string; loader: () => Promise<ExperimentModule>; help: string; formula: string; explanation: string };

const catalog: CatalogEntry[] = [
  { id: 'projectile', shortName: 'Projectile target', number: '01', category: 'Foundations', loader: () => import('./games/projectile'), help: 'Space launch/pause · R reset · N new target · Arrow keys aim', formula: 'x = v₀ cos(θ)t    y = y₀ + v₀ sin(θ)t − ½gt²', explanation: 'Analytic motion under uniform gravity; air resistance and spin are intentionally excluded.' },
  { id: 'pendulum', shortName: 'Double pendulum', number: '02', category: 'Foundations', loader: () => import('./games/double-pendulum'), help: 'Space pause/resume · R restart', formula: 'd²θ/dt² = f(θ₁, θ₂, ω₁, ω₂; m₁, m₂, l₁, l₂, g)', explanation: 'The coupled nonlinear equations use fixed-step fourth-order Runge–Kutta integration.' },
  { id: 'wave', shortName: 'Wave lab', number: '03', category: 'Foundations', loader: () => import('./games/wave-lab'), help: 'Space pause/resume · . single step · R reset', formula: 'u = Σ A sin(kr − ωt + φ)e⁻ᵅʳ', explanation: 'Analytic superposition visualizes displacement, phase, and interference intensity.' },
  { id: 'electromagnetism', shortName: 'Electric fields & potential', number: 'EM 01', category: 'Electromagnetism', loader: () => import('./games/electromagnetism-atlas'), help: 'Drag sources · tap to move probe · Space pause tracers · R reset', formula: 'E = (1 / 4πε₀) Σ qᵢ(r−rᵢ)/|r−rᵢ|³    E = −∇V', explanation: 'Movable point sources drive the field, potential, contours, streamlines, tracers, and planar flux diagnostic.' },
];

const root = document.querySelector<HTMLElement>('[data-playground]');
if (root) {
  const container = root;
  const tablist = container.querySelector<HTMLElement>('.experiment-tabs')!;
  const categorySelect = container.querySelector<HTMLSelectElement>('#experiment-category')!;
  const elements: ExperimentElements = {
    canvas: root.querySelector<HTMLCanvasElement>('#physics-canvas')!, controls: root.querySelector<HTMLElement>('#experiment-controls')!, actions: root.querySelector<HTMLElement>('#experiment-actions')!, data: root.querySelector<HTMLElement>('#physics-data')!, status: root.querySelector<HTMLElement>('#experiment-status')!, stage: root.querySelector<HTMLElement>('#experiment-stage')!, details: root.querySelector<HTMLElement>('#experiment-details')!,
  };
  const categories = [...new Set(catalog.map((entry) => entry.category))];
  categories.forEach((category) => categorySelect.append(new Option(category, category)));
  let active: Experiment | null = null;
  let activeId = '';
  let request = 0;

  function renderTabs(category: string, selectedId?: string) {
    const fragment = document.createDocumentFragment();
    catalog.filter((entry) => entry.category === category).forEach((entry, index) => {
      const button = document.createElement('button');
      const selected = entry.id === selectedId || (!selectedId && index === 0);
      button.type = 'button'; button.role = 'tab'; button.id = `tab-${entry.id}`; button.dataset.experiment = entry.id; button.setAttribute('aria-controls', 'experiment-stage'); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      const number = document.createElement('span'); number.textContent = entry.number; button.append(number, entry.shortName); fragment.append(button);
    });
    tablist.replaceChildren(fragment);
  }

  async function select(id: string, focus = false) {
    const entry = catalog.find((candidate) => candidate.id === id);
    if (!entry) return;
    if (categorySelect.value !== entry.category) { categorySelect.value = entry.category; renderTabs(entry.category, id); }
    const selection = ++request;
    active?.destroy(); active = null; activeId = id;
    elements.controls.replaceChildren(); elements.actions.replaceChildren(); elements.data.replaceChildren(); elements.details.replaceChildren(); elements.status.textContent = 'Loading instrument…';
    [...tablist.querySelectorAll<HTMLButtonElement>('[data-experiment]')].forEach((tab) => { const selected = tab.dataset.experiment === id; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; if (selected && focus) tab.focus(); });
    elements.stage.setAttribute('aria-labelledby', `tab-${id}`); localStorage.setItem('physics-playground:active', id); updateDetails(elements.details, entry.formula, [], entry.explanation);
    try {
      const module = await entry.loader(); if (selection !== request) return; active = new module.default();
      container.querySelector<HTMLElement>('#experiment-number')!.textContent = active.number; container.querySelector<HTMLElement>('#experiment-name')!.textContent = active.name; container.querySelector<HTMLElement>('#keyboard-help')!.textContent = `Keyboard: ${entry.help}`; elements.canvas.setAttribute('aria-label', active.name); elements.status.textContent = `${active.name} ready.`; active.mount(elements);
    } catch (error) { console.error(error); elements.status.textContent = 'The instrument could not start. Reload the page or try another experiment.'; }
  }

  categorySelect.addEventListener('change', () => { renderTabs(categorySelect.value); const first = catalog.find((entry) => entry.category === categorySelect.value); if (first) select(first.id); });
  tablist.addEventListener('click', (event) => { const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-experiment]'); if (tab) select(tab.dataset.experiment ?? 'projectile'); });
  tablist.addEventListener('keydown', (event) => { const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[data-experiment]')]; const current = tabs.findIndex((tab) => tab === document.activeElement); if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; select(tabs[next].dataset.experiment ?? activeId, true); });
  window.addEventListener('pagehide', () => active?.destroy(), { once: true });
  const requested = new URLSearchParams(location.search).get('experiment'); const saved = localStorage.getItem('physics-playground:active'); const initial = catalog.find((entry) => entry.id === requested)?.id ?? catalog.find((entry) => entry.id === saved)?.id ?? 'projectile'; const initialEntry = catalog.find((entry) => entry.id === initial)!; categorySelect.value = initialEntry.category; renderTabs(initialEntry.category, initial); select(initial);
}
