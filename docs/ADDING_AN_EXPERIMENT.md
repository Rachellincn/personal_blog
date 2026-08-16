# Adding a Physics Atlas experiment

1. Put pure equations and integrators in `src/scripts/playground/models/` or the relevant domain directory. Do not access DOM, Canvas, `window`, or display units there.
2. Add model tests for analytic limits, conservation/sign rules, singular behavior, and parameter trends.
3. Implement the `Experiment` lifecycle: `mount`, `pause`, `resume`, `reset`, and `destroy`.
4. Create one `CanvasSurface`; use `AnimationLoop` only when time actually changes the view.
5. Remove every model-specific pointer/keyboard listener in `destroy`. The shared loop and surface must also be destroyed.
6. Add the experiment to the catalog in `main.ts` with a category, lazy loader, keyboard help, formula, and explanation.
7. Expose every visual-only result through a text readout or status. Do not encode identity or sign through color alone.
8. Document theory, approximations, numerical method, parameter range, known limitations, and teaching goal.
9. Add Playwright switching, interaction, console-error, reduced-motion, and mobile-overflow coverage.
10. Run `npm run check`, `npm run test:physics`, `npm run build`, and `npm test` before opening a PR.

## Field experiments

Return `null` at singular or undefined samples. A renderer must display the excluded region and must not replace it with a finite cap. If a visual normalization is used, state that it changes glyph/color scale only and never the numerical model.

For computationally expensive fields, provide low-resolution drag preview, invalidate on parameter change, recompute at full resolution on pointer release, reduce mobile density, and pause all animation while hidden.
