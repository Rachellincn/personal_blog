import type { Experiment, ExperimentElements } from "./core/types";
import { updateDetails } from "./core/ui";

type ExperimentModule = { default: new () => Experiment };
type CatalogEntry = {
  id: string;
  shortName: string;
  number?: string;
  category: string;
  loader: () => Promise<ExperimentModule>;
  help: string;
  formula?: string;
  explanation?: string;
};

const catalog: CatalogEntry[] = [
  {
    id: "projectile",
    shortName: "Projectile target",
    number: "01",
    category: "Foundations / 基础实验",
    loader: () => import("./games/projectile"),
    help: "Space launch/pause · R reset · N new target · Arrow keys aim",
    formula: "x = v₀ cos(θ)t    y = y₀ + v₀ sin(θ)t − ½gt²",
    explanation:
      "Analytic motion under uniform gravity; air resistance and spin are intentionally excluded.",
  },
  {
    id: "pendulum",
    shortName: "Double pendulum",
    number: "02",
    category: "Foundations / 基础实验",
    loader: () => import("./games/double-pendulum"),
    help: "Space pause/resume · R restart",
    formula: "d²θ/dt² = f(θ₁, θ₂, ω₁, ω₂; m₁, m₂, l₁, l₂, g)",
    explanation:
      "The coupled nonlinear equations use fixed-step fourth-order Runge–Kutta integration.",
  },
  {
    id: "wave",
    shortName: "Wave lab",
    number: "03",
    category: "Foundations / 基础实验",
    loader: () => import("./games/wave-lab"),
    help: "Space pause/resume · . single step · R reset",
    formula: "u = Σ A sin(kr − ωt + φ)e⁻ᵅʳ",
    explanation:
      "Analytic superposition visualizes displacement, phase, and interference intensity.",
  },
  {
    id: "electromagnetism",
    shortName: "Electric fields & potential",
    number: "EM 01",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-atlas"),
    help: "Drag sources · tap to move probe · Space pause tracers · R reset",
    formula: "E = (1 / 4πε₀) Σ qᵢ(r−rᵢ)/|r−rᵢ|³    E = −∇V",
    explanation:
      "Movable point sources drive the field, potential, contours, streamlines, tracers, and planar flux diagnostic.",
  },
  {
    id: "electromagnetism-field-lines",
    shortName: "Electric field lines",
    number: "EM 02",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-field-lines"),
    help: "Drag sources · seed a line at the probe · R reset",
    formula: "dr/ds ∥ E(r)",
    explanation: "Adaptive streamlines start at positive charge and end at negative charge or the domain boundary without crossing.",
  },
  {
    id: "electromagnetism-equipotential",
    shortName: "Equipotential contours",
    number: "EM 03",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-equipotential"),
    help: "Drag sources · compare ∇V and E · R reset",
    formula: "E = −∇V    E·dl = 0 on V = constant",
    explanation: "Potential contours and the computed negative gradient expose local orthogonality to electric-field lines.",
  },
  {
    id: "electromagnetism-multipoles",
    shortName: "Dipoles & multipoles",
    number: "EM 04",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-multipoles"),
    help: "Choose dipole, quadrupole, or linear multipole · drag sources · R reset",
    formula: "V(r) = V₀ + Vdipole + Vquadrupole + ⋯",
    explanation: "Dipole and higher multipole presets compare angular structure and the dominant far-field contribution.",
  },
  {
    id: "electromagnetism-continuous-charge",
    shortName: "Continuous charge",
    number: "EM 05",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-continuous-charge"),
    help: "Drag the probe · compare analytic and numerical fields · R reset",
    formula: "E(r) = (1 / 4πε₀) ∫ (r−r′)/|r−r′|³ dq′",
    explanation:
      "Seven continuous source geometries compare closed-form fields with direct Coulomb integration and explicit approximation limits.",
  },
  {
    id: "electromagnetism-gauss-law",
    shortName: "Gauss law & symmetry",
    number: "EM 06",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-gauss-law"),
    help: "Drag the surface · inspect local E·dA · try the wrong-surface preset · R reset",
    formula: "∯S E·dA = Q enclosed / ε₀",
    explanation:
      "True 3-D Gaussian surfaces separate the universal flux law from the extra symmetry needed to solve directly for E.",
  },
  {
    id: "electromagnetism-conductors",
    shortName: "Conductors & shielding",
    number: "EM 07",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-conductors"),
    help: "Move the probe · compare tip and cavity presets · refine boundary · R reset",
    formula: "Φ(boundary) = constant    E(metal) = 0",
    explanation: "A 2-D boundary-collocation solve exposes surface charge, tip enhancement, cavities, shielding, and numerical residuals.",
  },
  {
    id: "electromagnetism-capacitors",
    shortName: "Capacitors & dielectrics",
    number: "EM 08",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-capacitors"),
    help: "Change geometry and dielectric · toggle battery/isolated · R reset",
    formula: "C = Q/V    D = ε₀E + P",
    explanation: "Parallel-plate, spherical, coaxial, and multi-capacitor models expose E, D, P, free/bound charge, capacitance, and energy.",
  },
  {
    id: "electromagnetism-energy",
    shortName: "Electrostatic energy",
    number: "EM 09",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-energy"),
    help: "Insert dielectric · compare fixed V and fixed Q · R reset",
    formula: "u = ½E·D    U = ½CV² = Q²/2C",
    explanation: "A computed energy curve separates stored field energy, dielectric insertion, source constraint, and battery exchange.",
  },
  {
    id: "electromagnetism-current-density",
    shortName: "Current density & drift",
    number: "EM 10",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-current-density"),
    help: "Space pause · . step · R reset",
    formula: "J = nqvₐ    I = JA",
    explanation: "Electron drift and conventional current share one signed microscopic model.",
  },
  {
    id: "electromagnetism-ohm-law",
    shortName: "Ohm law: J to V–I",
    number: "EM 11",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-ohm-law"),
    help: "Change geometry, resistivity, and voltage · R reset",
    formula: "V = IR    J = σE",
    explanation: "Microscopic conductivity, geometry, current, voltage, and Joule power remain linked by one model.",
  },
  {
    id: "electromagnetism-kirchhoff",
    shortName: "Kirchhoff circuit solver",
    number: "EM 12",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-kirchhoff"),
    help: "Toggle the switch · inspect equations and residuals · R reset",
    formula: "ΣI = 0    ΣΔV = 0",
    explanation: "A compact MNA solver derives node voltages and branch currents instead of animating hard-coded directions.",
  },
  {
    id: "electromagnetism-rc",
    shortName: "RC transient & energy",
    number: "EM 13",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-rc"),
    help: "Space pause · . step · change R and C · R reset",
    formula: "τ = RC    q = CV(1 − e⁻ᵗ⁄τ)",
    explanation: "Circuit motion, charge, current, voltage, energy, and time curves advance from the same analytic state.",
  },
  {
    id: "electromagnetism-rl",
    shortName: "RL transient & energy",
    number: "EM 14",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-rl"),
    help: "Space pause · . step · change R and L · R reset",
    formula: "τ = L/R    I = V(1 − e⁻ᵗ⁄τ)/R",
    explanation: "Current growth, induced voltage, magnetic energy, and the animated circuit share one time coordinate.",
  },
  {
    id: "electromagnetism-rlc",
    shortName: "RLC resonance & phasors",
    number: "EM 15",
    category: "Electromagnetism / 电磁学",
    loader: () => import("./games/electromagnetism-rlc"),
    help: "Choose free or driven response · Space pause · . step · R reset",
    formula: "Z = R + j(ωL − 1/ωC)",
    explanation: "Damping, resonance, impedance, waveform, energy, and phasor views all use the same RLC parameters.",
  },
  {
    id: "mechanics-kinematics-1d",
    shortName: "一维运动学",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/kinematics-1d"),
    help: "Drag a graph to scrub shared time · Space pause · . step · R reset",
  },
  {
    id: "mechanics-projectile-2d",
    shortName: "二维抛体",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/projectile-2d"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-circular-motion",
    shortName: "圆周运动",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/circular-motion"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-newton-fbd",
    shortName: "牛顿定律与受力图",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/newton-fbd"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-incline-friction",
    shortName: "斜面与摩擦",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/incline-friction"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-pulley",
    shortName: "滑轮与连接体",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/pulley"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-work-energy",
    shortName: "功—能定理",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/work-energy"),
    help: "Drag the body to set x · Space pause · . step · R reset",
  },
  {
    id: "mechanics-momentum-center",
    shortName: "动量与质心",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/momentum-center"),
    help: "Drag particle 1 · Space pause · . step · R reset",
  },
  {
    id: "mechanics-collision-1d",
    shortName: "一维碰撞",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/collision-1d"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-collision-2d",
    shortName: "二维碰撞",
    category: "Classical Mechanics / 经典力学 · Atlas I",
    loader: () => import("./games/mechanics/collision-2d"),
    help: "Drag disc 1 · Space pause · . step · R reset",
  },
  {
    id: "mechanics-rotation-kinematics",
    shortName: "转动运动学",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/rotation-kinematics"),
    help: "Drag a plot to scrub time · Space pause · . step · R reset",
  },
  {
    id: "mechanics-torque-equilibrium",
    shortName: "力矩与静力平衡",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/torque-equilibrium"),
    help: "Drag force point 1 · Space pause · . step · R reset",
  },
  {
    id: "mechanics-inertia-lab",
    shortName: "转动惯量",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/inertia-lab"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-rolling-sliding",
    shortName: "滚动与滑动",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/rolling-sliding"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-angular-momentum",
    shortName: "角动量守恒",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/angular-momentum"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-gyroscope",
    shortName: "陀螺进动",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/gyroscope"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-pendulum-phase",
    shortName: "单摆与相图",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/pendulum-phase"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-damped-oscillator",
    shortName: "阻尼振动",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/damped-oscillator"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-forced-resonance",
    shortName: "受迫振动与共振",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/forced-resonance"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-coupled-modes",
    shortName: "耦合振子与简正模",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/coupled-modes"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-transverse-wave",
    shortName: "一维横波",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/transverse-wave"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-standing-waves",
    shortName: "驻波与边界",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/standing-waves"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-wave-packet",
    shortName: "波包与群速度",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/wave-packet"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-central-force",
    shortName: "中心力运动",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/central-force"),
    help: "Drag particle to reset position · Space pause · . step · R reset",
  },
  {
    id: "mechanics-kepler-orbits",
    shortName: "开普勒轨道",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/kepler-orbits"),
    help: "Space pause/continue · . step · R reset",
  },
  {
    id: "mechanics-effective-potential",
    shortName: "有效势与稳定性",
    category: "Classical Mechanics / 经典力学 · Atlas II",
    loader: () => import("./games/mechanics/effective-potential"),
    help: "Space pause/continue · . step · R reset",
  },
];

const root = document.querySelector<HTMLElement>("[data-playground]");
if (root) {
  const container = root;
  const tablist = container.querySelector<HTMLElement>(".experiment-tabs")!;
  const categorySelect = container.querySelector<HTMLSelectElement>(
    "#experiment-category",
  )!;
  const elements: ExperimentElements = {
    canvas: container.querySelector<HTMLCanvasElement>("#physics-canvas")!,
    controls: container.querySelector<HTMLElement>("#experiment-controls")!,
    actions: container.querySelector<HTMLElement>("#experiment-actions")!,
    data: container.querySelector<HTMLElement>("#physics-data")!,
    status: container.querySelector<HTMLElement>("#experiment-status")!,
    stage: container.querySelector<HTMLElement>("#experiment-stage")!,
    details: container.querySelector<HTMLElement>("#experiment-details")!,
  };
  const categories = [...new Set(catalog.map((entry) => entry.category))];
  categories.forEach((category) =>
    categorySelect.append(new Option(category, category)),
  );
  let active: Experiment | null = null;
  let activeId = "";
  let request = 0;

  function renderTabs(category: string, selectedId?: string) {
    tablist.replaceChildren();
    catalog
      .filter((entry) => entry.category === category)
      .forEach((entry, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.role = "tab";
        button.id = `tab-${entry.id}`;
        button.dataset.experiment = entry.id;
        button.setAttribute("aria-controls", "experiment-stage");
        const selected =
          entry.id === selectedId || (!selectedId && index === 0);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        const number = document.createElement("span");
        number.textContent =
          entry.number ?? String(index + 1).padStart(2, "0");
        button.append(number, entry.shortName);
        tablist.append(button);
      });
  }
  async function select(id: string, focus = false) {
    const entry = catalog.find((candidate) => candidate.id === id);
    if (!entry) return;
    if (categorySelect.value !== entry.category) {
      categorySelect.value = entry.category;
      renderTabs(entry.category, id);
    }
    const selection = ++request;
    active?.destroy();
    active = null;
    activeId = id;
    elements.controls.replaceChildren();
    elements.actions.replaceChildren();
    elements.data.replaceChildren();
    elements.details.replaceChildren();
    elements.status.textContent = "Loading instrument…";
    const tabs = [
      ...tablist.querySelectorAll<HTMLButtonElement>("[data-experiment]"),
    ];
    tabs.forEach((tab) => {
      const selected = tab.dataset.experiment === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    elements.stage.setAttribute("aria-labelledby", `tab-${id}`);
    localStorage.setItem("physics-playground:active", id);
    if (entry.formula && entry.explanation) {
      updateDetails(elements.details, entry.formula, [], entry.explanation);
    }
    try {
      const module = await entry.loader();
      if (selection !== request) return;
      active = new module.default();
      container.querySelector<HTMLElement>("#experiment-number")!.textContent =
        active.number;
      container.querySelector<HTMLElement>("#experiment-name")!.textContent =
        active.name;
      container.querySelector<HTMLElement>("#keyboard-help")!.textContent =
        `Keyboard: ${entry.help}`;
      elements.canvas.setAttribute("aria-label", active.name);
      elements.status.textContent = `${active.name} ready.`;
      active.mount(elements);
    } catch (error) {
      console.error(error);
      elements.status.textContent =
        "The instrument could not start. Reload the page or try another experiment.";
    }
  }

  categorySelect.addEventListener("change", () => {
    renderTabs(categorySelect.value);
    const first = catalog.find(
      (entry) => entry.category === categorySelect.value,
    );
    if (first) select(first.id);
  });
  tablist.addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-experiment]",
    );
    if (tab) select(tab.dataset.experiment ?? "projectile");
  });
  tablist.addEventListener("keydown", (event) => {
    const tabs = [
      ...tablist.querySelectorAll<HTMLButtonElement>("[data-experiment]"),
    ];
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    if (
      current < 0 ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    )
      return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    select(tabs[next].dataset.experiment ?? activeId, true);
  });
  window.addEventListener("pagehide", () => active?.destroy(), { once: true });
  const requested = new URLSearchParams(location.search).get("experiment");
  const saved = localStorage.getItem("physics-playground:active");
  const initial =
    catalog.find((entry) => entry.id === requested)?.id ??
    catalog.find((entry) => entry.id === saved)?.id ??
    "projectile";
  const initialEntry = catalog.find((entry) => entry.id === initial)!;
  categorySelect.value = initialEntry.category;
  renderTabs(initialEntry.category, initial);
  select(initial);
}
