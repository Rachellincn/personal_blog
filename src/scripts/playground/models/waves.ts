export type WaveBoundary = "fixed" | "free" | "periodic";

export function reflectionCoefficient(boundary: "fixed" | "free") {
  return boundary === "fixed" ? -1 : 1;
}

export function transverseWave(
  x: number,
  time: number,
  amplitude: number,
  wavelength: number,
  frequency: number,
  direction: 1 | -1 = 1,
) {
  const k = (2 * Math.PI) / wavelength;
  const omega = 2 * Math.PI * frequency;
  return amplitude * Math.sin(k * x - direction * omega * time);
}

export function standingMode(
  x: number,
  time: number,
  length: number,
  mode: number,
  waveSpeed: number,
  boundary: "fixed-fixed" | "fixed-free" | "free-free",
) {
  const harmonic = boundary === "fixed-free" ? mode - 0.5 : mode;
  const k = (Math.PI * harmonic) / length;
  const omega = waveSpeed * k;
  const spatial = boundary === "free-free" ? Math.cos(k * x) : Math.sin(k * x);
  return { displacement: spatial * Math.cos(omega * time), k, omega };
}

export function standingFrequency(
  length: number,
  mode: number,
  waveSpeed: number,
  boundary: "fixed-fixed" | "fixed-free" | "free-free",
) {
  return (
    (waveSpeed * (boundary === "fixed-free" ? mode - 0.5 : mode)) /
    (2 * length)
  );
}

export function dispersiveOmega(k: number, speed: number, dispersion: number) {
  return speed * k + dispersion * k ** 3;
}

export function phaseVelocity(k: number, speed: number, dispersion: number) {
  return k === 0 ? speed : dispersiveOmega(k, speed, dispersion) / k;
}

export function groupVelocity(k: number, speed: number, dispersion: number) {
  return speed + 3 * dispersion * k ** 2;
}

export function gaussianWavePacket(
  x: number,
  time: number,
  centerWaveNumber: number,
  width: number,
  speed: number,
  dispersion: number,
) {
  const group = groupVelocity(centerWaveNumber, speed, dispersion);
  const carrier =
    centerWaveNumber * x -
    dispersiveOmega(centerWaveNumber, speed, dispersion) * time;
  const envelope = Math.exp(-((x - group * time) ** 2) / (2 * width ** 2));
  return envelope * Math.cos(carrier);
}
