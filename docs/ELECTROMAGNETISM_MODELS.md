# Electromagnetism models

## EM 01: electric field and potential

### Theory

For point charges in vacuum,

```text
E(r) = k Σ qᵢ (r − rᵢ) / |r − rᵢ|³
V(r) = k Σ qᵢ / |r − rᵢ|
k = 8.9875517923 × 10⁹ N·m²/C²
Ftest = qtest E
Utest = qtest V
```

All source contributions are evaluated independently and then summed component by component. The on-canvas head-to-tail inset uses those same contribution vectors. A central finite difference independently evaluates `−∇V` at the probe and reports agreement with the analytic field.

### Presets and interactions

The first slice includes a positive charge, negative charge, equal opposite pair, equal like pair, quadrupole, linear multipole, and deterministic random group. A user can drag movable sources, lock all sources into a fixed configuration, move the test-charge probe, add positive or negative 3 nC sources, reverse the test-charge sign, and seed a streamline at the probe.

### Singularities

A point charge has no finite field or potential at its position. The model returns `null` whenever a query lies inside `r < 0.09 m` of a source. It never replaces infinity with a clipped finite field. The renderer:

- skips vector, contour, gradient, and flux evaluation there;
- paints the sampled singular pixels separately;
- draws a dashed exclusion disk around every point source;
- reports an undefined readout if the probe enters the disk.

The 0.09 m disk is a numerical/display exclusion radius, not a finite-size charge model.

### Parameter range

- Source presets: 2–10 nC point charges.
- User-added sources: ±3 nC.
- World view: approximately ±3.2 m horizontally; the vertical range follows the Canvas aspect ratio.
- Test charge: ±1 nC.
- Singularity exclusion radius: 0.09 m.

### Numerical methods

- Field vectors: analytic point-charge equation.
- Potential: analytic point-charge equation.
- `−∇V`: second-order central difference with `h = 10⁻⁴ m`.
- Field lines: normalized midpoint integration; nominal step `0.038 m`; bounded to 620 steps.
- Equipotentials: marching squares on an adaptive desktop/mobile grid.
- Heat maps: sampled scalar buffer with robust percentile normalization.
- 2-D line flux: midpoint quadrature of `E·n dl` over a closed polyline.

### Known limitations

- Sources are ideal point charges in vacuum; there are no boundaries, conductors, or dielectric response.
- The Canvas is a 2-D slice. It does not imply the complete 3-D field-line density.
- Field-line count is a qualitative charge-magnitude cue, not an absolute flux measurement.
- Tracers are massless direction markers, not physical charged-particle trajectories.
- The Flux view computes a planar line integral. It is not the 3-D closed-surface integral in Gauss's law. Gaussian surfaces and enclosed-charge validation belong to Atlas PR 2.
- Contour topology is grid-resolution dependent close to the exclusion disks; no contour is interpolated through an undefined cell.

### Teaching goals

- Distinguish individual source fields from their vector sum.
- Relate field direction to the force on positive and negative test charges.
- Compare electric field, potential, potential energy, and distance at one probe.
- See that field lines leave positive charges and enter negative charges or the view boundary.
- Verify locally that equipotential contours are transverse to `E` and that `E = −∇V`.
- Recognize a point-charge singularity as undefined rather than merely “very large.”
