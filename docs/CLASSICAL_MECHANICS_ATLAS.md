# Classical Mechanics Atlas I–II

The Classical Mechanics Atlas extends the native-Canvas Physics Playground with 26 independently loaded experiments. It reuses the existing `AnimationLoop`, `CanvasSurface`, generated controls, data panel, status announcements, and experiment teardown contract.

## Experiment catalogue

Atlas I contains linked one-dimensional kinematics, enhanced projectile motion, circular motion, Newton/free-body diagrams, incline friction, pulley constraints, work–energy, momentum/centre of mass, and one- and two-dimensional collisions.

Atlas II contains rotational kinematics, torque/equilibrium, moment of inertia, rolling/sliding, angular momentum, gyroscopic precession, pendulum phase portraits, damped and forced oscillation, coupled normal modes, transverse and standing waves, wave packets, central-force motion, Kepler orbits, and effective potential.

Every Atlas experiment provides:

- pause/continue, fixed single-step, reset, time scale, and typical presets;
- live animation plus textual values that mirror the Canvas state;
- formula, symbol definitions, and a model-validity explanation;
- auto-scaled, fixed-scale, labeled, or hidden vectors with a redundant line-style legend;
- independently toggled trajectories/curves and guide/constraint lines;
- dynamically imported experiment entry points and complete lifecycle teardown.

## Model and numerical-method map

| Domain | Main model | Method |
| --- | --- | --- |
| Piecewise kinematics | exact constant-acceleration segments | analytic, no corner smoothing |
| Projectile without drag | uniform gravity | analytic |
| Projectile with drag/wind | linear or quadratic relative-air force | fixed-step RK4 |
| Contact and friction | adaptive static friction, kinetic transition | state machine + fixed step |
| Pulley systems | translational and rotational Newton equations | analytic acceleration + rope constraint |
| Work and potential | `F=-dU/dx` | five-point stable derivative + velocity Verlet |
| Disc collisions | normal impulse and overlap correction | adaptive fixed substeps |
| Pendulum and oscillator | nonlinear pendulum / damped driven SHO | fixed-step velocity-Verlet-style update |
| Coupled chains | analytic symmetric-chain eigenmodes | normalized modal decomposition |
| Mechanical waves | travelling/standing analytic fields | sampled analytic solution |
| Central forces and Kepler motion | radial acceleration from `U(r)` | velocity Verlet (symplectic) |

The animation scheduler advances numerical models with a `1/120 s` base step, caps frame catch-up, pauses offscreen/background work, and replaces non-finite state values with a finite reset state. Only the active experiment owns a Canvas and animation loop.

## Physics invariants under test

`npm run test:physics` directly exercises the pure model layer. The suite verifies:

- uniform-acceleration and drag-free projectile analytic limits;
- circular `r·v=0`;
- isolated total momentum, elastic energy, and inelastic momentum;
- frictionless mechanical energy and the static-friction bound;
- rope-length constraints and finite-number guards;
- angular momentum and pure-rolling contact velocity;
- the small-angle pendulum-period limit;
- undamped conservation and damped energy loss;
- normal-mode orthogonality and reflection phase at fixed/free ends;
- Kepler angular momentum, areal velocity, effective-potential extremum, and long-time energy drift.

`tests/site.spec.ts` also mounts all 26 entries through the real category registry and checks common actions, presets, formulas, finite readouts, mobile overflow, and console errors.

## Performance and mobile behavior

- Definitions are grouped by domain, while each experiment has a separate dynamic entry module.
- Only the selected experiment is imported and mounted.
- History buffers are bounded; collision substeps scale with speed/radius; Canvas DPR is capped.
- Desktop uses a side-by-side world/plot layout. Below 640 px, world and plots stack vertically inside the same Canvas.
- Controls collapse from two columns to one on narrow phones, and the experiment tab strip scrolls horizontally.
- Reduced-motion users start Atlas simulations paused and may advance with the shared Step action.

## Deliberate simplifications

- Gyroscope visualization implements fast steady precession, not the full Euler rigid-body equations.
- The pulley catalogue shares a general constraint visualizer; ideal moving-pulley geometry is pedagogical rather than a deformable-rope solver.
- Wave experiments use analytic sampled solutions instead of a general finite-difference PDE mesh.
- Coupled-chain mode shapes use identical masses and nearest-neighbour springs.
- Collision discs omit spin and tangential impulse.
- Kepler and effective-potential experiments use planar point masses and Newtonian gravity.
- Editable acceleration, angular-velocity, angular-acceleration, and potential controls use a small safe expression parser (arithmetic plus selected math functions); arbitrary JavaScript is never executed.
