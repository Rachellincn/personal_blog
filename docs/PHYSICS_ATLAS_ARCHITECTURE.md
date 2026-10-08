# Interactive Physics Atlas architecture

## Delivery boundaries

The Atlas grows through independently deployable experiment slices. The first Electromagnetism Atlas slice adds electric fields and potential only. Gaussian surfaces, conductors, circuits, magnetism, induction, and waves remain separate PRs so each model can be tested and reviewed without importing unfinished code.

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

## Lifecycle and performance

- Only the active experiment module is loaded.
- Switching experiments calls `destroy()` before importing the next module.
- `CanvasSurface` disconnects its `ResizeObserver`; `AnimationLoop` cancels RAF and removes visibility listeners.
- Static field modes do not run RAF. Tracer mode runs RAF and pauses offscreen, in hidden tabs, and for reduced motion.
- Dragging uses smaller sampling, contour, streamline, and heat-map grids. Pointer release invalidates the cache and recomputes at full precision.
- Mobile uses reduced grid and field-line counts.
- Cached numerical geometry is keyed by source position, charge, viewport bounds, and precision mode.

## Accessibility

Canvas information is repeated in labeled controls, a live definition list, status messages, and a formula/model panel. Positive/negative sources use a plus/minus glyph in addition to color. The test charge uses a ring and crosshair. Singular regions use a dashed boundary and explanatory text. Reduced-motion mode produces a static tracer snapshot.
