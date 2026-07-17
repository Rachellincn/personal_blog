# Units and conventions

## Internal system

Every physics model stores and computes in SI base/derived units. UI prefixes are parsed at the boundary and never leak into model state.

| Quantity | Internal unit | Supported teaching units in the shared module |
| --- | --- | --- |
| Charge | C | C, mC, µC, nC |
| Length | m | m, cm, mm |
| Electric field | N/C | N/C, V/m |
| Potential | V | V, mV |
| Energy | J | J, mJ, µJ |
| Time | s | s, ms, µs, ns |
| Magnetic field | T | T, mT, µT |

ASCII `u` and Greek micro symbols are accepted on input for micro-prefixed quantities. Output uses `µ`.

## Coordinates and signs

- World `+x` points right; world `+y` points up.
- Canvas `y` conversion is handled only by the renderer.
- Positive electric charge is drawn coral with `+`; negative charge is blue with `−`.
- Electric-field arrows show the force direction for a positive test charge.
- A negative test-charge force reverses the field direction.
- Closed 2-D flux curves are normalized to counterclockwise orientation before selecting outward normals.

## Formatting

Readouts choose a teaching prefix that keeps the displayed magnitude legible, use three significant digits by default, and use explicit scientific notation for quantities without a shared prefixed unit definition. Formatting never rounds the stored SI value.

## Range validation

Unit conversion rejects non-finite numbers, unsupported symbols, and dimension mismatches. Individual experiments additionally clamp UI positions and parameters to their documented valid ranges.
## Electromagnetism additions

Continuous distributions store `λ` in C/m, `σ` in C/m², and `ρ` in C/m³. Canvas coordinates are metres even when the drawing is a cross-section of a 3-D object. Electric field is N/C.

Physical Gaussian flux `∯E·dA` has units N·m²/C. The planar diagnostic `∮E·n dl` has units N·m/C and must not be interpreted as enclosed charge divided by `ε₀`.

The EM 07 conductor cross-section is translationally invariant; its solved panel and net charges are line charges in C/m. Capacitance is F, displacement and polarization are C/m², field-energy density is J/m³, and total stored energy is J.

Circuit models store carrier density in m⁻³, mobility in m²/(V·s), drift velocity in m/s, current density in A/m², current in A, resistivity in Ω·m, conductivity in S/m, resistance in Ω, capacitance in F, and inductance in H. UI values in mm², µF, and mH are converted once at the control boundary.

Every branch current is positive from its declared `from` node to `to` node; a voltage source uses `positive` to `negative`. A negative result means physical current is opposite the drawn reference arrow. Ground is exactly `0 V`. Phasor angles are stored in radians and only converted to degrees for display; source and current waveforms use cosine convention.
