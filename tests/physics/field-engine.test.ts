import { describe, expect, it } from 'vitest';
import { electricFieldAt, electricPotentialAt, type PointCharge } from '../../src/scripts/playground/electromagnetism/electrostatics';
import { contourSegments, ellipsePolyline, fieldLinesForCharges, fluxThroughClosedPolyline, sampleVectorField } from '../../src/scripts/playground/electromagnetism/field-engine';

const bounds = { minX: -3, maxX: 3, minY: -2, maxY: 2 };
const dipole: PointCharge[] = [
  { id: 'positive', position: { x: -1, y: 0 }, charge: 5e-9 },
  { id: 'negative', position: { x: 1, y: 0 }, charge: -5e-9 },
];

describe('field visualization engine', () => {
  it('samples null singular cells instead of capped values', () => {
    const samples = sampleVectorField((point) => electricFieldAt(point, [{ id: 'q', position: { x: 0, y: 0 }, charge: 1e-9 }]).vector, bounds, 7, 5);
    const center = samples.find((sample) => sample.x === 0 && sample.y === 0)!;
    expect(center.vector).toBeNull();
    expect(center.magnitude).toBeNull();
  });

  it('produces non-intersecting-equation streamlines that reach the negative charge', () => {
    const lines = fieldLinesForCharges(dipole, bounds, 12);
    expect(lines.length).toBeGreaterThanOrEqual(10);
    expect(lines.some((points) => {
      const end = points.at(-1)!;
      return Math.hypot(end.x - 1, end.y) < .13;
    })).toBe(true);
    expect(lines.every((points) => points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))).toBe(true);
  });

  it('extracts positive and negative equipotential contours', () => {
    const contours = contourSegments((point) => electricPotentialAt(point, dipole).value, bounds, 70, 50, [-10, -5, 5, 10]);
    expect(contours.filter((contour) => contour.level < 0).some((contour) => contour.segments.length > 0)).toBe(true);
    expect(contours.filter((contour) => contour.level > 0).some((contour) => contour.segments.length > 0)).toBe(true);
  });

  it('integrates closed-curve flux with correct orientation', () => {
    const curve = ellipsePolyline({ x: 0, y: 0 }, 1, 1, 720);
    const uniform = fluxThroughClosedPolyline(curve, () => ({ x: 2, y: -3 }));
    expect(uniform.value).toBeCloseTo(0, 10);
    const radial = fluxThroughClosedPolyline(curve, (point) => ({ x: point.x, y: point.y }));
    expect(radial.value).toBeCloseTo(2 * Math.PI, 3);
    expect(radial.skippedSegments).toBe(0);
  });
});
