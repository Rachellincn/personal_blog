# Interactive Physics Atlas architecture

## Delivery boundaries

The Atlas grows through independently deployable experiment slices. The first Electromagnetism Atlas slice adds electric fields and potential. The second adds continuous-charge integration and Gaussian surfaces. Conductors, circuits, magnetism, induction, and waves remain separate PRs so each model can be tested and reviewed without importing unfinished code.

## Runtime layers

1. `PlaygroundShell.astro` renders the accessible category browser, one shared Canvas, controls, text readout, status, and formula panel.
2. `main.ts` is a small catalog. It imports only the selected experiment, destroys the previous one, and preserves deep links through `?experiment=<id>`.
3. Each experiment implements `Experiment` and owns its listeners, Canvas surface, animation loop, cached samples, and controls.
4. Pure model modules contain SI calculations and have no DOM or Canvas dependency.
5. Reusable visualization modules sample model functions and return numerical geometry; game modules decide how to draw it.

Article pages never import the playground catalog. Electromagnetism code is therefore absent from ordinary article bundles and is split into its own lazy chunk on the playground page.

## Field Visualization Engine

`electromagnetism/field-engine.ts` accepts a scalar or 2-D vector function rather than point-charge-specific state. It currently provides:

- regular vector sampling with explicit null samples;
- robust percentile-based linear scaling and logarithmic arrow scaling;
- normalized midpoint streamline integration;
- marching-squares contour segments;
- massless field-tracer stepping;
- numerical flux through an arbitrary closed 2-D polyline;
- ellipse generation as one closed-curve preset.

This functional boundary allows later experiments to supply electric, magnetic, displacement, or Poynting fields without forking the renderer.

## Continuous-charge and Gauss-law boundaries

`electromagnetism/continuous-charge.ts` is a DOM-free model with a discriminated union for seven source geometries. Both analytic and numerical evaluators return a common result containing field, magnitude, method, sample count, singular state, and a human-readable validity contract.

`electromagnetism/gauss-law.ts` separates `ChargeScenario` from `GaussianSurface`. Scenarios provide fields and independently calculate enclosed charge; surfaces provide containment, intersection geometry, and weighted surface samples. `verifyGaussLaw` combines them into local and total flux results. This composition lets the UI intentionally pair a source with a poor surface without special-case rendering logic.

The arbitrary 2-D curve remains in `field-engine.ts`. It does not implement `GaussianSurface`, so TypeScript keeps planar line flux out of the physical 3-D Gauss-law calculation.

## Lifecycle and performance

- Only the active experiment module is loaded.
- Switching experiments calls `destroy()` before importing the next module.
- `CanvasSurface` disconnects its `ResizeObserver`; `AnimationLoop` cancels RAF and removes visibility listeners.
- Static field modes do not run RAF. Tracer mode runs RAF and pauses offscreen, in hidden tabs, and for reduced motion.
- Dragging uses smaller sampling, contour, streamline, and heat-map grids. Pointer release invalidates the cache and recomputes at full precision.
- Mobile uses reduced grid and field-line counts.
- Cached numerical geometry is keyed by source position, charge, viewport bounds, and precision mode.
- Continuous-charge and Gaussian experiments are static: they schedule no animation frame. During pointer movement they temporarily lower quadrature resolution and recompute at full selected resolution on release.

## Accessibility

Canvas information is repeated in labeled controls, a live definition list, status messages, and a formula/model panel. Positive/negative sources use a plus/minus glyph in addition to color. The test charge uses a ring and crosshair. Singular regions use a dashed boundary and explanatory text. Gaussian local-flux colors are repeated by sign in the legend and numerical text. Reduced-motion mode produces a static tracer snapshot.
