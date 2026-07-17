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

## EM 02–04: field lines, equipotentials, and multipoles

EM 02, EM 03, and EM 04 are independent deep links backed by the EM 01 Field Visualization Engine. EM 02 starts in normalized-streamline mode, EM 03 starts with marching-squares potential contours, and EM 04 starts with the quadrupole magnitude map. Each entry has its own persisted preset/view state; the underlying field, potential, singularity, gradient, and rendering contracts remain identical to EM 01.

- **Theory:** EM 02 integrates curves tangent to `E`; EM 03 samples `V = constant` and checks `E = −∇V`; EM 04 compares monopole, dipole, quadrupole, and linear-multipole source arrangements.
- **Approximations and numerical method:** these are 2-D slices of ideal 3-D point-charge fields. Streamlines use bounded midpoint integration, contours use finite-grid marching squares, and far-field dominance is demonstrated by the exact source sum rather than by fitting coefficients.
- **Parameter range:** the same ±3.2 m view, 2–10 nC presets, ±1 nC test charge, and 0.09 m singularity exclusion used by EM 01.
- **Known limitations:** line density is qualitative, contour topology is resolution-dependent near exclusions, and EM 04 does not expose a symbolic arbitrary-order multipole tensor.
- **Teaching goal:** keep three different representations—integral curves, scalar level sets, and far-field source structure—distinct while showing that all are calculated from one field/potential state.

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

## EM 10: current density and drift velocity

### Model

```text
v_d = sign(q) μE
J = nqv_d
I = JA
```

The signed carrier charge determines drift direction. For electrons, `v_d` points opposite `E`, while the two negative signs in `nqv_d` make conventional `J` point with `E`. The animation reads that signed velocity; its direction is not a decorative constant.

- **Parameters:** `E = 0.2–8 V/m`, mobility `0.5–8 × 10⁻³ m²/(V·s)`, area `0.2–4 mm²`; copper-like density `8.5 × 10²⁸ m⁻³` is fixed.
- **Approximation/numerics:** uniform material, uniform field, one carrier population, analytic arithmetic only.
- **Limitations:** no Fermi surface, scattering-time distribution, Hall field, heating, or velocity saturation.
- **Teaching goal:** distinguish slow electron drift from conventional current and link microscopic carrier flux to amperes.

## EM 11: Ohm law from microscopic to circuit scale

### Model

```text
ρ(T) = ρref[1 + α(T − Tref)]
R = ρ(T)L/A
E = V/L
J = σE = I/A
P = VI
```

- **Parameters:** `V = 1–24 V`, `L = 0.5–5 m`, area `0.2–4 mm²`, temperature `0–120 °C`; copper reference resistivity and linear coefficient are used.
- **Approximation/numerics:** a homogeneous ohmic conductor with a linear temperature coefficient; direct analytic evaluation.
- **Limitations:** no self-heating feedback, contact resistance, skin effect, non-ohmic response, or temperature-dependent geometry.
- **Teaching goal:** show that `V = IR` and `J = σE` are the same constitutive statement at different scales.

## EM 12: Kirchhoff editor and DC solver

The lightweight editor keeps a grounded source and series resistor, then lets the user replace a branch with a voltage source, current source, resistor, capacitor, inductor, switch, or wire. Ground is an explicit reference node. The graph is rebuilt and solved after every edit.

Modified nodal analysis (MNA) solves node voltages plus ideal-voltage-constraint currents. Branch-current signs follow the displayed endpoint order. The readout includes nodes, branches, current directions, voltage drops, KCL residual, loop KVL residual, the equation labels, and the numerical solution.

- **Parameters:** source `2–24 V`, series resistance `10–200 Ω`; the edited branch derives a safe teaching-scale value from the same controls.
- **DC approximations:** capacitors are open circuits; inductors and wires are ideal shorts; an open switch is open and a closed switch is an ideal short. All sources and components are ideal and time-independent.
- **Numerical method:** dense partial-pivot Gaussian elimination on the small MNA matrix. Singular/floating or contradictory ideal circuits throw instead of returning non-finite values.
- **Known limitations:** one editable two-terminal branch, no drag-and-drop topology, dependent sources, nonlinear devices, transient netlist solve, or sparse-matrix scaling.
- **Teaching goal:** connect a drawn branch orientation to signed current, node voltage, KCL, KVL, and the matrix solution rather than memorizing loop directions.

## EM 13: RC charging

```text
τ = RC
Vc(t) = V(1 − e⁻ᵗ/τ)
I(t) = (V/R)e⁻ᵗ/τ
q(t) = CVc(t)
UC = ½CVc²
```

The moving circuit markers, voltage curve, current, charge, energy, and normalized `Vc–I` phase curve all sample the same time state. Source work equals capacitor energy plus resistor heat within floating-point precision.

- **Parameters:** `R = 5–150 Ω`, `C = 20–300 µF`, `V = 2–24 V`; the plot spans six time constants.
- **Approximation/numerics:** ideal step source and lumped, linear components; closed-form response, no time integrator.
- **Limitations:** charging only in this slice; no ESR, leakage, dielectric absorption, switch bounce, or parasitic inductance.
- **Teaching goal:** relate one time constant to simultaneous voltage, current, charge, and energy transfer.

## EM 14: RL transient

```text
τ = L/R
I(t) = (V/R)(1 − e⁻ᵗ/τ)
VL(t) = Ve⁻ᵗ/τ
UL = ½LI²
```

The circuit motion, current curve, inductor voltage, energy, and normalized `I–VL` phase curve share one time coordinate.

- **Parameters:** `R = 5–150 Ω`, `L = 10–200 mH`, `V = 2–24 V`; the plot spans six time constants.
- **Approximation/numerics:** ideal DC step and linear lumped elements; analytic response.
- **Limitations:** no winding resistance beyond the selected series `R`, saturation, hysteresis, core loss, or stray capacitance.
- **Teaching goal:** connect back-emf decay, current growth, and magnetic-energy storage.

## EM 15: RLC free response and sinusoidal steady state

### Free response

```text
α = R/(2L),  ω₀ = 1/√(LC)
α < ω₀: underdamped
α = ω₀: critical
α > ω₀: overdamped
```

The solver uses the exact real solution for each regime, including the repeated-root critical case. Buttons set `R` directly from `2√(L/C)`, so the critical preset is not lost to slider quantization. The live `q–I` phase trajectory, time curve, electric energy, magnetic energy, and circuit markers share one analytic state. At `R = 0`, the tested LC limit conserves `q²/(2C) + LI²/2`.

### Sinusoidal steady state

```text
Z = R + j(ωL − 1/ωC)
I₀ = V₀/|Z|
f₀ = 1/(2π√(LC))
```

The current waveform and `VR`, `VL`, `VC`, and source phasors are derived from the identical `R`, `L`, `C`, frequency, source phase, and shared time. The resonance action writes the analytic `f₀` into that same model state. Instantaneous charge and electric/magnetic energies are calculated from the steady-state current phase.

- **Parameters:** `R = 5–150 Ω` through the slider (preset values may be exact between steps), `L = 10–200 mH`, `C = 20–300 µF`, amplitude `2–24 V`, frequency `2–100 Hz`.
- **Approximation/numerics:** ideal series lumped RLC; exact homogeneous solutions and complex phasor algebra. Free and driven modes are separate teaching models, not a combined forced transient.
- **Limitations:** no component tolerance, nonlinear loss, source impedance, parasitics, switching transient in driven mode, or arbitrary topology.
- **Teaching goal:** connect damping roots, resonance, impedance phase, waveform timing, phasor addition, phase space, and energy exchange without duplicating parameters between views.

## EM 19: long straight wire

### Model

```text
B(r) = μ₀I/(2πr) φ̂
φ̂ = l̂ × r̂⊥
```

The wire direction, signed current, perpendicular displacement, and cross product determine the field vector. Reversing current reverses every field arrow and right-hand-rule circle. Queries within the ideal-wire exclusion radius return `null` rather than a capped finite field.

- **Parameters:** current `−10–10 A`, probe radius `0.08–1.4 m`.
- **Approximation/numerics:** infinitely long, zero-radius wire in vacuum; analytic vector evaluation.
- **Limitations:** no finite endpoints, material permeability, skin effect, return conductor, or finite wire radius.
- **Teaching goal:** derive circular field direction and the inverse-radius law from a signed vector model.

## EM 20: circular current loop

### Model

```text
Baxis(z) = μ₀NIa² / [2(a² + z²)³ᐟ²]
μ = NIπa² n̂
Bdipole,axis = μ₀μ/(2π|z|³)
```

The cross-sectional field map subdivides the loop into 72 current elements and sends the resulting `Bx,Bz` field through the shared vector sampler, logarithmic arrow scaling, and midpoint streamline engine. The independent axis formula and dipole approximation expose when the far-field model becomes accurate.

- **Parameters:** current `−10–10 A`, radius `0.15–0.8 m`, `1–240` turns, axial probe `0–2.2 m`.
- **Approximation/numerics:** filamentary circular turns in vacuum; midpoint Biot–Savart quadrature for the 2-D slice and analytic axis field.
- **Limitations:** turns are coincident, wire thickness is excluded, and the segmented off-axis field is a teaching quadrature rather than an elliptic-integral evaluator.
- **Teaching goal:** connect current direction, closed field lines, axis field, magnetic moment, and the far-field dipole limit.

## EM 21: finite solenoid

The axial field uses the finite-solenoid expression

```text
Bz = (μ₀nI/2)(cosθnear − cosθfar),  n = N/L.
```

The readout compares this result with the long-solenoid interior `μ₀nI` and reports a fringe factor. Interior arrows use the signed analytic direction. Dashed exterior return curves are explicitly labeled qualitative; their shape is not used for numerical readouts.

- **Parameters:** current `−10–10 A`, radius `0.12–0.65 m`, length `0.4–2.2 m`, `20–500` turns, axial probe `−1.8–1.8 m`.
- **Approximation/numerics:** continuous surface-current sheet with uniform winding density; analytic on-axis field.
- **Limitations:** off-axis magnitude, discrete winding ripple, core response, finite wire, and lead fields are omitted.
- **Teaching goal:** distinguish the useful uniform-interior approximation from finite-length fringe and exterior return fields.

## EM 22: Biot–Savart wire sketch

### Model and interaction

```text
dB ≈ (μ₀/4π) I Δl × r / |r|³
B = Σ dB.
```

Canvas taps append up to 12 wire vertices. Each adjacent pair becomes a current element; the live panel exposes every element contribution, their vector sum, skipped singular elements, and the selected probe. Undoing or adding points is the visible refinement path.

- **Parameters:** current `−10–10 A`; probe coordinates `−1.3–1.3 m` and `−1–1 m`; up to 11 segments.
- **Numerical method:** midpoint current-element quadrature. The exclusion test uses distance to the entire segment, not only its midpoint. If the probe intersects any ideal segment, the total is `null` because omitting that divergent term would be misleading.
- **Limitations:** a coarse polyline is not a converged smooth-wire result; all points lie in one plane and wire radius is zero.
- **Teaching goal:** see how signed `Δl × r` contributions add and why shorter elements improve a Riemann-sum approximation.

## EM 23: Ampère loop law

```text
∮C B·dl = μ₀Ienclosed.
```

Centered circle, offset “wrong” circle, subdivided rectangle, and multi-wire presets show local oriented `dl`, `B·dl`, the numerical integral, enclosed signed current, expected `μ₀I`, residual, and skipped singular samples. Point-in-polygon geometry calculates enclosed current independently of the field integral.

`canExtractFieldBySymmetry` is a separate geometric predicate. Only a circular loop coaxial with all represented long wires permits `|B|` to be factored out. The equality remains valid for offset, rectangular, and asymmetric multi-wire paths.

- **Parameters:** current `−10–10 A`, loop size `0.2–1.1 m`; 160 rectangle or 240 circle elements.
- **Approximation/numerics:** ideal infinite parallel wires and midpoint line integration.
- **Limitations:** prescribed planar loops only; no surface-current density or arbitrary 3-D contour editor in this slice.
- **Teaching goal:** separate the universal integral law from the additional symmetry needed to solve directly for field magnitude.

## EM 24: magnetic dipole interaction

```text
τ = μ × B
U = −μ·B
Fj = Σi μi ∂Bi/∂xj
Bdipole = μ₀[3(μ·r̂)r̂ − μ]/(4πr³)
```

Moment angle, external field, and `dBz/dx` drive torque, potential energy, and nonuniform-field force. A deterministic spherical surface integral of the same dipole field reports near-zero net magnetic flux, implementing the no-magnetic-monopole check.

- **Parameters:** moment `0.05–1 A·m²`, field `−0.8–0.8 T`, angle `0–180°`, gradient `−0.5–0.5 T/m`.
- **Approximation/numerics:** ideal point dipole and locally linear field gradient; analytic interaction plus midpoint spherical flux quadrature.
- **Limitations:** no finite magnet geometry, hysteresis, induced moment, higher multipoles, or back-reaction on the external source.
- **Teaching goal:** connect the loop right-hand rule to `μ`, alignment energy, torque, gradient force, and `∇·B = 0`.

## EM 25: force on currents and simplified motor

### Models

```text
F = I L × B
Fparallel/L = μ₀I₁I₂/(2πd)
μcoil = NIA n̂
τcoil = μcoil × B.
```

Parallel-wire arrows use the sign of `I₁I₂`: equal signed directions attract and opposite directions repel. The rectangular-coil scene shows the force couple through its net magnetic moment. The motor scene advances a damped rotor from the calculated torque; reversing current reverses moment and torque rather than merely reversing an animation flag.

- **Parameters:** currents `−10–10 A`, external field `−0.8–0.8 T`, `1–240` turns, coil angle `0–180°`; displayed wire spacing and coil dimensions are fixed teaching geometry.
- **Approximation/numerics:** uniform external field, rigid filamentary coil, fixed moment of inertia, linear damping, and fixed-step rotor integration.
- **Limitations:** no commutator, electrical back-emf, inductive current dynamics, bearings, load torque, or magnetic-core geometry.
- **Teaching goal:** unify force on a segment, interaction between currents, torque on a loop, and motor rotation through signed cross products.
