# Physics Atlas numerical methods

## Sampling contract

Scalar fields return `number | null`; vector fields return `Vec2 | null`. `null` means the model is undefined at that point. The visualization engine propagates that state instead of substituting zero or a capped value.

## Arrow grids

Vector grids are sampled only after model parameters, viewport bounds, or precision mode change. Arrow direction uses the normalized vector. Length can use:

- linear scaling against the 88th-percentile valid magnitude, capped at the cell size; or
- `log1p(9|E|/Eref) / log(10)` scaling.

The percentile reference prevents one near-source sample from suppressing the rest of the field. It is a visual normalization only; numerical readouts always use the unscaled SI value.

## Streamlines

The integrator advances along the normalized field with an explicit midpoint step. Integration stops at the view boundary, a source exclusion disk, a vanishing vector, a repeated neighborhood, or the maximum step count. Positive sources emit forward lines. If no positive source exists, negative sources emit backward integrations whose point order is reversed so arrows still follow the electric-field direction.

Exact solutions of a smooth first-order vector field do not intersect. Small visual convergence can occur at a finite-resolution sink, but the renderer never splices two polylines or invents a crossing.

## Equipotential contours

Marching squares samples `V` on a rectangular grid and linearly interpolates valid edge crossings. Cells touching a singular/null sample are omitted. Ambiguous four-crossing cells use the cell-center average to choose a pairing. Contour values are symmetric fractions of a robust potential reference so positive and negative topology remain visible.

## Scalar maps

Magnitude maps use logarithmic color normalization against a robust 90th-percentile magnitude. Potential maps use a signed diverging palette. Undefined pixels receive a distinct neutral dark value, and source exclusion rings are overlaid.

## Closed-curve flux diagnostic

For a counterclockwise 2-D polyline segment `Δl = (Δx,Δy)`, the outward normal measure is `(dy,−dx)`. Midpoint quadrature accumulates

```text
Φ₂D ≈ Σ [Ex(xmid) dy − Ey(xmid) dx].
```

Clockwise inputs are reversed automatically. Undefined segments are skipped and counted. This diagnostic is deliberately separated from 3-D Gaussian-surface integration.

## Accuracy and convergence

Pure model tests check analytic invariants. Browser rendering uses lower grids during drag and on mobile, then recomputes at full precision after drag. Future Gaussian and continuous-distribution experiments must report their quadrature resolution and a numerical error estimate in the readout.
