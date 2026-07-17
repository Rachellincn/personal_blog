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

## EM 05: continuous charge distributions

### Shared integral

Every continuous source evaluates the same SI-space Coulomb integral,

```text
E(r) = (1 / 4πε₀) ∫ (r − r′) / |r − r′|³ dq′,
dq′ = λ dl′, σ dA′, or ρ dV′.
```

The experiment includes a finite uniform rod, uniform ring, uniform disk, infinite line, infinite plane, uniform spherical shell, and uniform solid sphere. Each has an analytic evaluator and an independent direct-integration evaluator. The live readout shows both magnitudes, sample count, relative vector error, and the active validity statement.

The ring and disk closed forms are intentionally axis-only. Moving the probe off axis reports `analytic-axis-only`; it does not silently apply an axial formula to a general point. Ideal zero-radius or zero-thickness source points report `singular` rather than a capped value.

### Infinite-source approximations

The analytic infinite line and plane are ideal models. Numerical mode must use a finite source:

- the line integrates a symmetric segment `z = ±Lwindow`;
- the plane integrates a finite disk of radius `Rwindow`.

The chosen window is stated in the readout. Increasing it demonstrates convergence toward the infinite-source result; it does not turn the sampled finite object into a literally infinite one.

### Teaching goals

- Connect `dq = λdl`, `σdA`, and `ρdV` to the same Coulomb integral.
- Compare a closed form with a weighted numerical sum at the same probe.
- Distinguish an ideal source singularity from a numerical overflow.
- See where a symmetry-derived analytic formula is valid and where numerical integration is still general.
- Interpret an “infinite” numerical source as a finite-window convergence experiment.

## EM 06: Gauss law and symmetry

### Physical 3-D surface integral

```text
∯S E·dA = Qenclosed / ε₀.
```

The model samples true closed 3-D spheres, cylinders, and pillboxes. Every sample retains its position, outward unit normal, area weight, electric field, and local contribution `E·dA`. The report includes numerical flux, expected flux, enclosed charge, separately reported un-enclosed finite charge, skipped singular samples, and relative integration error.

Scenarios cover a point charge, uniform solid sphere, infinite line, infinite plane, and asymmetric point-charge group. Sphere–sphere enclosed volume is analytic, including partial overlap. Cylinder–sphere overlap uses deterministic area quadrature. Infinite line and plane scenarios report un-enclosed charge as non-finite rather than pretending it is zero.

### Law versus symmetry

Gauss law is valid for every closed 3-D surface. Extracting `E` from the integral requires an additional symmetry argument:

- a Gaussian sphere must be concentric with a point charge or spherical distribution;
- a Gaussian cylinder must be coaxial with the infinite line;
- a pillbox must cross the infinite plane;
- asymmetric sources generally do not make `|E|` constant on a convenient surface.

The “Wrong surface preset” deliberately breaks those conditions. Flux still agrees with `Qenclosed/ε₀`, while the readout says that `E` cannot be pulled outside the integral.

### 2-D diagnostic boundary

The optional closed-curve view computes `∮C E·n dl` in a plane. Its units are `N·m/C`, it never infers enclosed charge, and the interface labels it “not a Gaussian surface.” The physical Gauss-law views use closed 3-D surfaces and units `N·m²/C`.

### Known limitations

- The Canvas is a projection/cross-section of the sampled 3-D surface, not a perspective renderer.
- Surface quadrature is deterministic and finite; visual local arrows are subsampled from the full report.
- A singular source exactly on a sampled surface element is skipped and counted. Such a surface is mathematically ill-posed for the ideal point-source field and should be moved.
- Continuous media are static, uniform, and in vacuum; conductors and dielectric boundary conditions are outside this slice.

## EM 07: conductors and electrostatic shielding

The conductor experiment solves an infinitely long 2-D conductor cross-section with a boundary-collocation method. Boundary panels carry unknown line charge `λⱼ`; the linear system enforces one conductor potential and a specified total line charge:

```text
Φ(r) = Φext(r) − (1 / 2πε₀) Σ λⱼ ln|r − rⱼ|,
Φ(rᵢ on every connected boundary) = Φconductor.
```

Outer ellipse and optional circular cavity panels share the same solved potential. The renderer derives every surface-charge marker from the solution. It reports boundary-potential spread, residual field at an interior point, cavity shielding ratio, tip-density enhancement, and collocation count. The charged-circle, ellipse-tip, and empty-cavity presets demonstrate uniform charge, sharp-curvature enhancement, zero field in metal, equipotential surfaces, and electrostatic shielding.

This is a controlled teaching approximation for an infinitely long cross-section, not a general 3-D boundary-element solver. Charge is per unit length (C/m). Panel self-potential uses the analytic average logarithmic distance of a constant panel. Refining the boundary is the user-visible convergence check.

## EM 08: capacitors and dielectrics

The analytic capacitor model includes:

```text
parallel plates: C = εA/d
concentric spheres: C = 4πεab/(b−a)
coaxial cylinders: C = 2πεL/ln(b/a)
series: 1/Ceq = Σ1/Cᵢ
parallel: Ceq = ΣCᵢ
```

Vacuum and uniform linear dielectrics scale `ε = ε₀εr`. A partially inserted parallel-plate dielectric is modeled as side-by-side area capacitors. Layers normal to the plates are modeled in series, giving the thickness-weighted harmonic permittivity. Readouts include `E`, `D`, `P`, free and bound surface charge, capacitance, charge, voltage, stored energy, energy density, and the equivalent value of a three-capacitor network.

Parallel-plate fringing is optional and explicitly labeled as a first-order finite-square-plate capacitance correction. The drawn interior field remains the ideal uniform field; it is not presented as a numerical fringe-field map. Sphere and coax models exclude misalignment and end effects.

## EM 09: electrostatic energy

The energy laboratory uses the same capacitor model and compares dielectric insertion under two physical constraints:

```text
u = ½ E·D,
U = ½CV²  (fixed applied voltage),
U = Q²/(2C)  (fixed isolated charge).
```

At fixed voltage, stored field energy rises as capacitance increases and the battery exchanges energy and charge. At fixed charge, stored field energy falls and voltage decreases. The plotted curve is recomputed from the selected dielectric fraction, not pre-drawn. A positive insertion tendency is calculated from `dC/df` for both constraints.
