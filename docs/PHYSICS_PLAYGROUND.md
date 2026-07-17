# Physics Playground engineering notes

The expanded 26-experiment mechanics implementation is documented in [CLASSICAL_MECHANICS_ATLAS.md](./CLASSICAL_MECHANICS_ATLAS.md). The electric-field and potential implementation is documented in [ELECTROMAGNETISM_MODELS.md](./ELECTROMAGNETISM_MODELS.md). This file describes the shared shell used by the original instruments and both atlases.

## Architecture and lifecycle

`PlaygroundShell.astro` provides one canvas, one control surface, and one text readout. `main.ts` dynamically imports exactly one experiment and destroys it before mounting the next. Each experiment owns only its model-specific state and drawing code.

Shared modules provide:

- `AnimationLoop`: one `requestAnimationFrame` scheduler with fixed updates, accumulated time, a maximum frame delta, bounded catch-up, Page Visibility pause, Intersection Observer pause, and `destroy()` cleanup.
- `CanvasSurface`: `ResizeObserver`, device-pixel-ratio scaling, pointer coordinate conversion, and observer cleanup.
- `ui.ts`: labeled controls, actions, status announcements, and text data readout.
- `math.ts`: units, clamps, finite-value guards, interpolation, and deterministic seeded randomness.

Switching experiments calls `destroy()` before the next dynamic module mounts. No previous loop, observer, or document event listener remains active.

## Numerical models

### Electromagnetism Atlas: electric field and potential

Movable ideal point charges provide analytic `E` and `V`. A reusable field engine samples arrows, midpoint-integrated streamlines, marching-squares equipotentials, magnitude maps, massless tracers, and arbitrary closed 2-D line-flux curves. All calculations use SI units. Queries within 0.09 m of a point source return an explicit undefined result; the Canvas shows a dashed exclusion disk and never presents a clipped finite field as physical.

EM 05 adds seven continuous distributions with analytic/direct-integration comparison. EM 06 composes charge scenarios with true 3-D Gaussian spheres, cylinders, and pillboxes, while retaining the arbitrary 2-D curve as an explicitly non-Gaussian diagnostic. See `ELECTROMAGNETISM_MODELS.md`, `NUMERICAL_METHODS.md`, and `UNITS_AND_CONVENTIONS.md` for the complete model contract.

### Projectile Target

With launch height `y₀`, speed `v₀`, angle `θ`, and constant downward gravity `g`, the model is analytic:

```text
x(t) = v₀ cos(θ)t
y(t) = y₀ + v₀ sin(θ)t − ½gt²
v(t) = (v₀ cos(θ), v₀ sin(θ) − gt)
```

Flight time is the positive root of `y(t)=0`; maximum height is `y₀ + (v₀sinθ)²/(2g)`. Collision uses the distance between projectile and target centers. Score decreases with closest approach, and the best score is stored in `localStorage`. A seeded PRNG makes target placement reproducible in tests through `?seed=123`.

### Double Pendulum

The state is `(θ₁, ω₁, θ₂, ω₂)`. Accelerations come from the standard coupled nonlinear double-pendulum equations with configurable lengths, masses, and gravity. The state advances with classical fourth-order Runge–Kutta (RK4) on fixed substeps no larger than 8 ms after simulation-speed scaling.

Mechanical energy is reported as:

```text
T = ½(m₁+m₂)l₁²ω₁² + ½m₂l₂²ω₂² + m₂l₁l₂ω₁ω₂cos(θ₁−θ₂)
V = −(m₁+m₂)gl₁cosθ₁ − m₂gl₂cosθ₂
E = T + V
```

“Nearby initial state” starts a second system with `Δθ₁ = 0.0005 rad`. It uses a dashed rod/trace and square terminal bob in addition to color, so the distinction is not color-only. Denominator guards, finite-number checks, bounded frame catch-up, substep limits, and an emergency stop prevent NaN propagation or numerical runaway.

### Wave Lab

Wave Lab evaluates a damped analytic field rather than solving a full finite-difference PDE:

```text
u(x,y,t) = Σ A exp(−αrᵢ) sin(krᵢ − ωt + φᵢ)
k = 2π/λ,  ω = 2πf
```

The displacement display colors signed `u`. The intensity display uses the squared magnitude of summed complex phasors, producing stable two-source interference fringes. The equal-phase display bands the complex phase. Pointer input moves alternating sources.

## Performance strategy

- Only Playground imports experiment modules; article pages do not include experiment JavaScript.
- Only the active experiment exists. Background tabs and offscreen canvas elements stop their RAF loops.
- DPR is capped at 2.5 to avoid oversized high-density buffers.
- Wave Lab renders at about 30 fps on desktop and 20 fps on mobile/low-core devices. Its sampling grid drops from roughly 210 columns to 112 columns on mobile.
- Projectile particles and trail arrays have hard caps. Double-pendulum trails are user-bounded and trimmed in place.
- The home research graphic becomes static when reduced motion is requested or hardware concurrency/device memory suggests a low-performance device.

## Accessibility strategy

- Every generated control has a visible label and live value; buttons and tabs are keyboard reachable.
- Tabs implement `tablist`, `tab`, `tabpanel`, `aria-selected`, arrow-key navigation, Home, and End.
- Canvas output is mirrored in a live text data panel and status line.
- Experiment identity is not encoded only by color: labels, line styles, and bob shapes provide redundant cues.
- Pointer Events support mouse, touch, and pen through one listener path.
- Reduced-motion mode disables decorative home animation and removes projectile particles/hit bursts. Wave Lab starts paused and can advance with Step.
- Without JavaScript, the page still exposes experiment descriptions and core formulas.

## Adding an experiment

1. Create `src/scripts/playground/games/new-experiment.ts` implementing the `Experiment` interface from `core/types.ts`.
2. Construct one `CanvasSurface` and one `AnimationLoop` in `mount()`; build controls/readouts with `ui.ts`.
3. Implement `pause`, `resume`, `reset`, and a complete `destroy()` that removes model-specific event listeners.
4. Add a catalog entry with a dynamic import, category, display number, and keyboard help in `playground/main.ts`; the shell generates category options and tabs.
5. Add text formulas to the no-script and lab-note sections.
6. Add Playwright switching, action, mobile, reduced-motion, and console-error coverage.

## Manual test checklist

### Shared shell

- Switch Projectile → Pendulum → Wave repeatedly; confirm only the selected data and controls remain.
- Background the page and scroll the canvas offscreen; confirm simulation time stops advancing.
- Resize desktop, tablet, and phone widths; confirm a sharp canvas and no horizontal page overflow.
- Navigate controls and tabs with keyboard only; verify visible focus and announced status updates.

### Projectile

- Drag or tap above the launcher and confirm the angle control follows.
- Change speed, angle, and gravity; toggle theory/velocity; Launch, Pause/Resume, Reset, and New Target.
- Hit and miss targets; verify score, closest result message, and persisted best score.

### Double pendulum

- Adjust both lengths, both masses, both angles, gravity, trail, and speed.
- Pause/Resume and Restart; verify energy remains finite under normal parameters.
- Generate a nearby state and confirm solid/circular versus dashed/square systems visibly diverge.

### Wave Lab

- Switch single/double source, phase, frequency, wavelength, amplitude, decay, and all three displays.
- Tap the canvas repeatedly; confirm the active source alternates in double-source mode.
- Pause and use Step; verify simulation time advances exactly one step.

## Known limitations

- Projectile motion intentionally excludes drag, spin, wind, and terrain collision.
- Double-pendulum energy will show small bounded integration drift; it is not a symplectic integrator.
- Wave Lab is an analytic superposition visualization, not a boundary-reflecting finite-difference wave solver.
- Browser `localStorage` and Clipboard features may be unavailable in strict private/security modes; the simulations still run.
