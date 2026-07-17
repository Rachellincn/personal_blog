import type { Experiment, ExperimentElements } from "./core/types";

type ExperimentModule = { default: new () => Experiment };
type CatalogEntry = {
  id: string;
  shortName: string;
  category: string;
  loader: () => Promise<ExperimentModule>;
  help: string;
};

const catalog: CatalogEntry[] = [
  {
    id: "projectile",
    shortName: "Projectile target",
    category: "Foundations / 基础实验",
    loader: () => import("./games/projectile"),
    help: "Space launch/pause · R reset · N new target · Arrow keys aim",
  },
  {
    id: "pendulum",
    shortName: "Double pendulum",
    category: "Foundations / 基础实验",
    loader: () => import("./games/double-pendulum"),
    help: "Space pause/resume · R restart",
  },
  {
    id: "wave",
    shortName: "Wave lab",
    category: "Foundations / 基础实验",
    loader: () => import("./games/wave-lab"),
    help: "Space pause/resume · . single step · R reset",
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
        number.textContent = String(index + 1).padStart(2, "0");
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
