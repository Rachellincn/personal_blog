import type { AtlasPlot, AtlasScene } from "./atlas-types";
import type { Point, Vector } from "./types";

const palette = ["#ef8d78", "#315b73", "#a795c8", "#52704e", "#bc713f"];

export function renderAtlas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: AtlasScene,
  options: {
    vectors: string;
    labels: boolean;
    trails: boolean;
    guides: boolean;
  },
) {
  const plots = scene.plots ?? [];
  const stacked = plots.length > 0 && width < 640;
  const worldWidth = stacked ? width : plots.length ? width * 0.55 : width;
  const worldHeight = stacked ? height * 0.54 : height;
  const bounds = scene.bounds ?? { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  const margin = 34;
  const available = {
    x: margin,
    y: 44,
    width: worldWidth - margin * 1.6,
    height: worldHeight - 82,
  };
  const scale = Math.min(
    available.width / Math.max(1e-9, bounds.xMax - bounds.xMin),
    available.height / Math.max(1e-9, bounds.yMax - bounds.yMin),
  );
  const origin = {
    x:
      available.x +
      (available.width - (bounds.xMax - bounds.xMin) * scale) / 2 -
      bounds.xMin * scale,
    y:
      available.y +
      (available.height - (bounds.yMax - bounds.yMin) * scale) / 2 +
      bounds.yMax * scale,
  };
  const screen = (point: Point) => ({
    x: origin.x + point.x * scale,
    y: origin.y - point.y * scale,
  });

  if (options.guides) drawGrid(ctx, available, origin, scale);
  scene.constraints?.forEach((constraint) => {
    const from = screen(constraint.from);
    const to = screen(constraint.to);
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "#6b777d";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
    if (constraint.label)
      drawLabel(
        ctx,
        constraint.label,
        (from.x + to.x) / 2,
        (from.y + to.y) / 2,
      );
  });
  if (options.trails)
    scene.curves?.forEach((curve, index) =>
      drawCurve(
        ctx,
        curve.points.map(screen),
        curve.kind,
        palette[index % palette.length],
      ),
    );
  scene.bodies.forEach((body, index) => {
    const point = screen(body);
    const radius = Math.max(7, Math.min(24, (body.radius ?? 0.06) * scale));
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = index % 2 ? "#dcebf2" : "#f8d8ce";
    ctx.strokeStyle = "#263238";
    ctx.lineWidth = 2;
    if (body.shape === "square") {
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      if (body.shape !== "ring") ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    drawLabel(ctx, body.label, point.x, point.y + radius + 14);
  });
  if (options.vectors !== "hide")
    scene.vectors?.forEach((vector, index) =>
      drawVector(
        ctx,
        screen(vector),
        vector,
        scale,
        options.vectors === "auto",
        options.labels,
        index,
      ),
    );
  scene.annotations?.forEach((annotation) => {
    const point = screen(annotation);
    drawLabel(ctx, annotation.text, point.x, point.y, true);
  });
  if (scene.energy?.length)
    drawEnergy(
      ctx,
      scene.energy,
      18,
      worldHeight - 30,
      Math.max(130, worldWidth - 36),
    );
  if (plots.length) {
    const plotArea = stacked
      ? {
          x: 12,
          y: worldHeight + 4,
          width: width - 24,
          height: height - worldHeight - 16,
        }
      : {
          x: worldWidth + 10,
          y: 22,
          width: width - worldWidth - 24,
          height: height - 42,
        };
    drawPlots(
      ctx,
      plots,
      plotArea.x,
      plotArea.y,
      plotArea.width,
      plotArea.height,
    );
  }
  if (scene.vectors?.length && options.vectors !== "hide")
    drawLegend(ctx, scene.vectors, 16, 18);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  origin: Point,
  scale: number,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(49,91,115,.12)";
  ctx.lineWidth = 1;
  const step = Math.max(24, scale * 0.25);
  for (let x = origin.x % step; x < area.x + area.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, area.y);
    ctx.lineTo(x, area.y + area.height);
    ctx.stroke();
  }
  for (let y = origin.y % step; y < area.y + area.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#8a969b";
  ctx.beginPath();
  ctx.moveTo(area.x, origin.y);
  ctx.lineTo(area.x + area.width, origin.y);
  ctx.moveTo(origin.x, area.y);
  ctx.lineTo(origin.x, area.y + area.height);
  ctx.stroke();
  ctx.restore();
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  kind = "numeric",
  color: string,
) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = kind === "numeric" || kind === "trajectory" ? 2.5 : 1.2;
  if (kind === "theory") ctx.setLineDash([4, 5]);
  if (kind === "constraint") ctx.setLineDash([8, 5]);
  ctx.beginPath();
  points.forEach((point, index) =>
    index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
  );
  ctx.stroke();
  ctx.restore();
}

function drawVector(
  ctx: CanvasRenderingContext2D,
  start: Point,
  vector: Vector,
  worldScale: number,
  auto: boolean,
  labels: boolean,
  index: number,
) {
  const magnitude = Math.hypot(vector.dx, vector.dy);
  const factor = auto
    ? Math.min(44, Math.max(13, 28 / Math.max(0.001, magnitude)))
    : worldScale * 0.18;
  const end = {
    x: start.x + vector.dx * factor,
    y: start.y - vector.dy * factor,
  };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const color = palette[index % palette.length];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = vector.kind === "acceleration" ? 2.5 : 2;
  if (vector.kind === "acceleration") ctx.setLineDash([5, 3]);
  if (vector.kind === "constraint") ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - 9 * Math.cos(angle - 0.45),
    end.y - 9 * Math.sin(angle - 0.45),
  );
  ctx.lineTo(
    end.x - 9 * Math.cos(angle + 0.45),
    end.y - 9 * Math.sin(angle + 0.45),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (labels)
    drawLabel(
      ctx,
      `${vector.label}${vector.value ? ` ${vector.value}` : ""}`,
      end.x,
      end.y - 9,
      true,
    );
}

function drawPlots(
  ctx: CanvasRenderingContext2D,
  plots: AtlasPlot[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const gap = 8;
  const plotHeight = (height - gap * (plots.length - 1)) / plots.length;
  plots.forEach((plot, plotIndex) => {
    const top = y + plotIndex * (plotHeight + gap);
    const area = {
      x: x + 32,
      y: top + 18,
      width: width - 42,
      height: plotHeight - 30,
    };
    ctx.fillStyle = "rgba(255,253,248,.74)";
    ctx.strokeStyle = "#d3d0c8";
    ctx.fillRect(x, top, width, plotHeight);
    ctx.strokeRect(x, top, width, plotHeight);
    ctx.fillStyle = "#263238";
    ctx.font = "600 10px DM Mono, monospace";
    ctx.fillText(plot.title, x + 8, top + 13);
    const points = plot.series.flatMap((series) => series.points);
    const xMin = Math.min(...points.map((point) => point.x), 0);
    const xMax = Math.max(...points.map((point) => point.x), 1);
    const yMin = Math.min(...points.map((point) => point.y), 0);
    const yMax = Math.max(...points.map((point) => point.y), 1);
    const spanX = Math.max(1e-9, xMax - xMin);
    const spanY = Math.max(1e-9, yMax - yMin);
    const screen = (point: Point) => ({
      x: area.x + ((point.x - xMin) / spanX) * area.width,
      y: area.y + area.height - ((point.y - yMin) / spanY) * area.height,
    });
    ctx.strokeStyle = "#8a969b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();
    plot.series.forEach((series, index) =>
      drawCurve(
        ctx,
        series.points.map(screen),
        series.kind,
        palette[index % palette.length],
      ),
    );
    if (plot.interval) {
      const left = area.x + ((plot.interval[0] - xMin) / spanX) * area.width;
      const right = area.x + ((plot.interval[1] - xMin) / spanX) * area.width;
      ctx.fillStyle = "rgba(239,141,120,.16)";
      ctx.fillRect(left, area.y, right - left, area.height);
    }
    if (plot.cursor !== undefined) {
      const cursor = area.x + ((plot.cursor - xMin) / spanX) * area.width;
      ctx.strokeStyle = "#263238";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cursor, area.y);
      ctx.lineTo(cursor, area.y + area.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function drawEnergy(
  ctx: CanvasRenderingContext2D,
  values: Array<{ label: string; value: number }>,
  x: number,
  y: number,
  width: number,
) {
  const total =
    values.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
  let cursor = x;
  values.forEach((item, index) => {
    const segment = (width * Math.max(0, item.value)) / total;
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(cursor, y - 10, segment, 10);
    cursor += segment;
  });
  ctx.fillStyle = "#263238";
  ctx.font = "9px DM Mono, monospace";
  ctx.fillText(
    values.map((item) => `${item.label} ${item.value.toFixed(2)}`).join(" · "),
    x,
    y + 2,
  );
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  vectors: Vector[],
  x: number,
  y: number,
) {
  const items = [
    ...new Map(
      vectors.map((vector) => [vector.kind ?? vector.label, vector]),
    ).values(),
  ].slice(0, 4);
  ctx.font = "9px DM Mono, monospace";
  items.forEach((vector, index) => {
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(x + index * 76, y - 6, 12, 2);
    ctx.fillStyle = "#46545a";
    ctx.fillText(vector.label, x + 16 + index * 76, y);
  });
}
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  background = false,
) {
  ctx.save();
  ctx.font = "10px DM Mono, monospace";
  ctx.textAlign = "center";
  const width = ctx.measureText(text).width;
  if (background) {
    ctx.fillStyle = "rgba(255,253,248,.86)";
    ctx.fillRect(x - width / 2 - 3, y - 9, width + 6, 13);
  }
  ctx.fillStyle = "#263238";
  ctx.fillText(text, x, y);
  ctx.restore();
}
