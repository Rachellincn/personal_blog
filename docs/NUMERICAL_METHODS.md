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

Pure model tests check analytic invariants. Browser rendering uses lower grids during drag and on mobile, then recomputes at full precision after drag. Gaussian and continuous-distribution experiments report their quadrature resolution and a numerical error estimate in the readout.

## Continuous-charge quadrature

- Rod, ring, and finite-line windows use midpoint line elements.
- Disk and finite-plane windows use polar cells weighted by `r dr dφ`; the origin is never over-weighted as a rectangular-grid pixel.
- Spherical shells use equal solid-angle latitude/longitude area weights.
- Solid spheres use deterministic Halton samples in equal-volume radial coordinates. For an interior probe, the exactly cancelling uniform ball centered on that probe is removed before sampling to reduce integrable near-singular variance.
- Requested work is capped at 20,000 samples. Pointer drags temporarily use a smaller budget and recompute with the selected budget on release.

Relative field error is the norm of the vector difference divided by the analytic vector norm. If the analytic formula is outside its declared domain or either result is singular, the UI reports no percentage rather than constructing one from missing data.

Model regression tolerances reflect the method and geometry: line/ring tests converge near machine precision, disk and shell use weighted quadrature tolerances, the finite plane is checked against its stated large-disk approximation, and the solid sphere has separate interior/exterior tolerances.

## Gaussian-surface quadrature

Spheres use midpoint latitude bands and uniform longitude cells with area

```text
dA = R² sinθ dθ dφ.
```

Cylinders and pillboxes combine curved-side cells `R dφ dz` with polar cap cells `r dr dφ`. Each cell evaluates the field at its midpoint and accumulates `(E·n)dA`. The rendered normal arrows are only a subsample; the reported total uses every valid cell.

For nearly cancelling flux, relative error is normalized by the largest meaningful reference among expected net flux, absolute local flux, and a charge-based scale. This avoids dividing harmless round-off by zero for a closed surface containing no net charge.

Enclosed charge is calculated independently of the flux integral. Point inclusion and line/plane intersection are analytic. Sphere–sphere overlap uses the exact lens-volume formula; sphere–cylinder overlap uses deterministic polar-area integration of the overlapping vertical interval. This independence is essential: agreement is a real verification, not the same calculation shown twice.

## Numerical contracts

- Singular samples are skipped and counted, never clamped.
- Infinite sources expose a finite-window approximation only in the continuous-charge numerical experiment; Gauss scenarios use their analytic ideal fields.
- `canExtractFieldBySymmetry` is a geometry predicate, not an inference from a small numerical error.
- The 2-D line-flux diagnostic and 3-D surface flux use distinct result types, units, formulas, and UI labels.

## Conductor boundary collocation

EM 07 discretizes the outer conductor and cavity into constant line-charge panels. For `N` panels it solves `N` equal-potential equations plus one total-line-charge constraint. Partial-pivot Gaussian elimination is applied after scaling charge unknowns to nC/m so voltage and constraint rows remain numerically comparable.

The 2-D logarithmic Green function is the correct model for an infinitely long cross-section. A panel diagonal uses the average self-distance `L/(2e)` for panel length `L`; off-diagonal interactions use the collocation-point distance. Field samples use the derivative of the logarithmic kernel.

Accuracy is not inferred from one picture. The model reports:

- maximum minus minimum solved boundary potential;
- that spread relative to the larger conductor/external potential scale;
- residual interior field relative to the applied field;
- residual field at the cavity center;
- boundary sample count.

The test suite checks circular charge uniformity, equipotential residual, ellipse tip enhancement, interior screening, empty-cavity screening, charge conservation, and finite off-boundary evaluation.
