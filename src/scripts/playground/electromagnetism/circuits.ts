export type DcElement =
  | { id: string; kind: 'resistor'; from: string; to: string; resistance: number }
  | { id: string; kind: 'current-source'; from: string; to: string; current: number }
  | { id: string; kind: 'voltage-source'; positive: string; negative: string; voltage: number }
  | { id: string; kind: 'capacitor'; from: string; to: string; capacitance: number }
  | { id: string; kind: 'inductor'; from: string; to: string; inductance: number }
  | { id: string; kind: 'switch'; from: string; to: string; closed: boolean }
  | { id: string; kind: 'wire'; from: string; to: string };

export interface DcCircuit {
  nodes: string[];
  ground: string;
  elements: DcElement[];
}

export interface DcCircuitResult {
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  branchVoltageDrops: Record<string, number>;
  kclResiduals: Record<string, number>;
  maxKclResidual: number;
  equations: string[];
  kvlLoops: Array<{ label: string; residual: number }>;
}

export function currentDensityState(options: { carrierDensity: number; carrierCharge: number; mobility: number; electricField: number; area: number }) {
  assertPositive(options.carrierDensity, 'carrier density'); assertPositive(options.mobility, 'mobility'); assertPositive(options.area, 'area'); assertFinite(options.carrierCharge, 'carrier charge'); assertFinite(options.electricField, 'electric field');
  if (options.carrierCharge === 0) throw new Error('Carrier charge must be nonzero.');
  const driftVelocity = Math.sign(options.carrierCharge) * options.mobility * options.electricField;
  const currentDensity = options.carrierDensity * options.carrierCharge * driftVelocity;
  return { ...options, driftVelocity, currentDensity, current: currentDensity * options.area, carrierFlux: options.carrierDensity * driftVelocity };
}

export function ohmicConductorState(options: { resistivity: number; length: number; area: number; voltage: number; temperature?: number; referenceTemperature?: number; temperatureCoefficient?: number }) {
  assertPositive(options.resistivity, 'resistivity'); assertPositive(options.length, 'length'); assertPositive(options.area, 'area'); assertFinite(options.voltage, 'voltage');
  const temperature = options.temperature ?? 293.15; const referenceTemperature = options.referenceTemperature ?? 293.15; const coefficient = options.temperatureCoefficient ?? 0;
  const adjustedResistivity = options.resistivity * (1 + coefficient * (temperature - referenceTemperature));
  if (!(adjustedResistivity > 0)) throw new Error('Temperature-adjusted resistivity must stay positive.');
  const resistance = adjustedResistivity * options.length / options.area; const current = options.voltage / resistance; const electricField = options.voltage / options.length; const currentDensity = current / options.area;
  return { ...options, temperature, referenceTemperature, adjustedResistivity, resistance, current, electricField, currentDensity, conductivity: 1 / adjustedResistivity, power: options.voltage * current };
}

export function solveDcCircuit(circuit: DcCircuit): DcCircuitResult {
  validateCircuit(circuit);
  const nodes = circuit.nodes.filter((node) => node !== circuit.ground);
  const nodeIndex = new Map(nodes.map((node, index) => [node, index]));
  const constraints = circuit.elements.filter((element) =>
    element.kind === 'voltage-source' || element.kind === 'wire' ||
    element.kind === 'inductor' || (element.kind === 'switch' && element.closed));
  const nodeCount = nodes.length;
  const size = nodeCount + constraints.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const right = Array(size).fill(0);
  const addConductance = (from: string, to: string, conductance: number) => {
    const a = nodeIndex.get(from); const b = nodeIndex.get(to);
    if (a !== undefined) matrix[a][a] += conductance;
    if (b !== undefined) matrix[b][b] += conductance;
    if (a !== undefined && b !== undefined) { matrix[a][b] -= conductance; matrix[b][a] -= conductance; }
  };
  const addInjection = (node: string, current: number) => { const index = nodeIndex.get(node); if (index !== undefined) right[index] += current; };
  for (const element of circuit.elements) {
    if (element.kind === 'resistor') { assertPositive(element.resistance, `${element.id} resistance`); addConductance(element.from, element.to, 1 / element.resistance); }
    if (element.kind === 'current-source') { assertFinite(element.current, `${element.id} current`); addInjection(element.from, -element.current); addInjection(element.to, element.current); }
    if (element.kind === 'capacitor') assertPositive(element.capacitance, `${element.id} capacitance`);
    if (element.kind === 'inductor') assertPositive(element.inductance, `${element.id} inductance`);
  }
  constraints.forEach((element, constraintIndex) => {
    const index = nodeCount + constraintIndex;
    const positive = element.kind === 'voltage-source' ? element.positive : element.from;
    const negative = element.kind === 'voltage-source' ? element.negative : element.to;
    const p = nodeIndex.get(positive); const n = nodeIndex.get(negative);
    if (p !== undefined) { matrix[p][index] += 1; matrix[index][p] += 1; }
    if (n !== undefined) { matrix[n][index] -= 1; matrix[index][n] -= 1; }
    right[index] = element.kind === 'voltage-source' ? element.voltage : 0;
  });
  const solution = solveLinear(matrix, right);
  const nodeVoltages: Record<string, number> = { [circuit.ground]: 0 };
  nodes.forEach((node, index) => { nodeVoltages[node] = solution[index]; });
  const branchCurrents: Record<string, number> = {};
  const branchVoltageDrops: Record<string, number> = {};
  const constraintIndex = new Map(constraints.map((element, index) => [element.id, nodeCount + index]));
  for (const element of circuit.elements) {
    const from = element.kind === 'voltage-source' ? element.positive : element.from;
    const to = element.kind === 'voltage-source' ? element.negative : element.to;
    const voltage = nodeVoltages[from] - nodeVoltages[to];
    branchVoltageDrops[element.id] = voltage;
    if (element.kind === 'resistor') branchCurrents[element.id] = voltage / element.resistance;
    else if (element.kind === 'current-source') branchCurrents[element.id] = element.current;
    else if (element.kind === 'capacitor' || (element.kind === 'switch' && !element.closed)) branchCurrents[element.id] = 0;
    else branchCurrents[element.id] = solution[constraintIndex.get(element.id)!];
  }
  const kclResiduals: Record<string, number> = Object.fromEntries(nodes.map((node) => [node, 0]));
  for (const element of circuit.elements) {
    const from = element.kind === 'voltage-source' ? element.positive : element.from;
    const to = element.kind === 'voltage-source' ? element.negative : element.to;
    const current = branchCurrents[element.id];
    if (from !== circuit.ground) kclResiduals[from] += current;
    if (to !== circuit.ground) kclResiduals[to] -= current;
  }
  const kvlLoops = constraints.map((element) => ({
    label: `${element.id} voltage constraint`,
    residual: Math.abs(branchVoltageDrops[element.id] - (element.kind === 'voltage-source' ? element.voltage : 0)),
  }));
  return {
    nodeVoltages,
    branchCurrents,
    branchVoltageDrops,
    kclResiduals,
    maxKclResidual: Math.max(0, ...Object.values(kclResiduals).map(Math.abs)),
    equations: [
      ...nodes.map((node) => `KCL(${node}): Σ I_branch = 0`),
      ...kvlLoops.map((loop) => `KVL: ${loop.label}`),
    ],
    kvlLoops,
  };
}

export function rcStepResponse(options: { resistance: number; capacitance: number; voltage: number }, time: number) {
  validateTransient(options.resistance, options.capacitance, time);
  const timeConstant = options.resistance * options.capacitance;
  const decay = Math.exp(-time / timeConstant);
  const capacitorVoltage = options.voltage * (1 - decay);
  const current = options.voltage / options.resistance * decay;
  const charge = options.capacitance * capacitorVoltage;
  const capacitorEnergy = .5 * options.capacitance * capacitorVoltage ** 2;
  const sourceEnergy = options.capacitance * options.voltage ** 2 * (1 - decay);
  return { time, timeConstant, capacitorVoltage, resistorVoltage: options.voltage - capacitorVoltage, current, charge, capacitorEnergy, resistorEnergy: sourceEnergy - capacitorEnergy, sourceEnergy };
}

export function rlStepResponse(options: { resistance: number; inductance: number; voltage: number }, time: number) {
  validateTransient(options.resistance, options.inductance, time);
  const timeConstant = options.inductance / options.resistance;
  const decay = Math.exp(-time / timeConstant);
  const current = options.voltage / options.resistance * (1 - decay);
  const inductorVoltage = options.voltage * decay;
  const inductorEnergy = .5 * options.inductance * current ** 2;
  const sourceEnergy = options.voltage ** 2 / options.resistance * (time - timeConstant * (1 - decay));
  return { time, timeConstant, current, resistorVoltage: options.resistance * current, inductorVoltage, inductorEnergy, resistorEnergy: sourceEnergy - inductorEnergy, sourceEnergy };
}

export function rlcFreeResponse(options: { resistance: number; inductance: number; capacitance: number; initialCharge: number; initialCurrent: number }, time: number) {
  assertPositive(options.inductance, 'inductance'); assertPositive(options.capacitance, 'capacitance');
  if (options.resistance < 0 || !Number.isFinite(options.resistance) || time < 0 || !Number.isFinite(time)) throw new Error('RLC resistance and time must be finite and nonnegative.');
  const alpha = options.resistance / (2 * options.inductance);
  const omega0 = 1 / Math.sqrt(options.inductance * options.capacitance);
  const discriminant = alpha ** 2 - omega0 ** 2;
  let regime: 'underdamped' | 'critical' | 'overdamped'; let charge: number; let current: number; let dampedFrequency = 0;
  if (Math.abs(discriminant) <= 1e-12 * omega0 ** 2) {
    regime = 'critical'; const a = options.initialCharge; const b = options.initialCurrent + alpha * a; const decay = Math.exp(-alpha * time);
    charge = decay * (a + b * time); current = decay * (b - alpha * (a + b * time));
  } else if (discriminant < 0) {
    regime = 'underdamped'; dampedFrequency = Math.sqrt(-discriminant); const a = options.initialCharge; const b = (options.initialCurrent + alpha * a) / dampedFrequency; const angle = dampedFrequency * time; const decay = Math.exp(-alpha * time);
    charge = decay * (a * Math.cos(angle) + b * Math.sin(angle));
    current = decay * ((-a * dampedFrequency - alpha * b) * Math.sin(angle) + (b * dampedFrequency - alpha * a) * Math.cos(angle));
  } else {
    regime = 'overdamped'; const root = Math.sqrt(discriminant); const r1 = -alpha + root; const r2 = -alpha - root; const a = (options.initialCurrent - r2 * options.initialCharge) / (r1 - r2); const b = options.initialCharge - a;
    charge = a * Math.exp(r1 * time) + b * Math.exp(r2 * time); current = a * r1 * Math.exp(r1 * time) + b * r2 * Math.exp(r2 * time);
  }
  return { regime, time, alpha, naturalFrequency: omega0, dampedFrequency, charge, current, capacitorVoltage: charge / options.capacitance, capacitorEnergy: charge ** 2 / (2 * options.capacitance), inductorEnergy: .5 * options.inductance * current ** 2 };
}

export function sinusoidalRlcState(options: { resistance: number; inductance: number; capacitance: number; sourceAmplitude: number; frequency: number; sourcePhase: number }, time: number) {
  assertPositive(options.resistance, 'resistance'); assertPositive(options.inductance, 'inductance'); assertPositive(options.capacitance, 'capacitance'); assertPositive(options.frequency, 'frequency');
  const omega = 2 * Math.PI * options.frequency; const inductiveReactance = omega * options.inductance; const capacitiveReactance = 1 / (omega * options.capacitance); const reactance = inductiveReactance - capacitiveReactance; const impedanceMagnitude = Math.hypot(options.resistance, reactance); const impedancePhase = Math.atan2(reactance, options.resistance); const currentAmplitude = options.sourceAmplitude / impedanceMagnitude; const currentPhase = options.sourcePhase - impedancePhase;
  const currentPhasor = phasor(currentAmplitude, currentPhase); const resistor = scale(currentPhasor, options.resistance); const inductor = rotateScale(currentPhasor, inductiveReactance); const capacitor = rotateScale(currentPhasor, -capacitiveReactance); const sourcePhasor = add(add(resistor, inductor), capacitor);
  return { time, omega, current: currentAmplitude * Math.cos(omega * time + currentPhase), currentAmplitude, currentPhase, inductiveReactance, capacitiveReactance, reactance, impedanceMagnitude, impedancePhase, sourcePhasor, currentPhasor, voltagePhasors: { resistor, inductor, capacitor }, sourceVoltage: options.sourceAmplitude * Math.cos(omega * time + options.sourcePhase) };
}

function phasor(magnitude: number, phase: number) { return { x: magnitude * Math.cos(phase), y: magnitude * Math.sin(phase) }; }
function scale(value: { x: number; y: number }, factor: number) { return { x: value.x * factor, y: value.y * factor }; }
function rotateScale(value: { x: number; y: number }, factor: number) { return { x: -value.y * factor, y: value.x * factor }; }
function add(a: { x: number; y: number }, b: { x: number; y: number }) { return { x: a.x + b.x, y: a.y + b.y }; }

function validateCircuit(circuit: DcCircuit) { if (!circuit.nodes.includes(circuit.ground) || new Set(circuit.nodes).size !== circuit.nodes.length) throw new Error('Circuit requires unique nodes and one listed ground.'); const ids = new Set<string>(); for (const element of circuit.elements) { if (ids.has(element.id)) throw new Error(`Duplicate element id: ${element.id}`); ids.add(element.id); const endpoints = element.kind === 'voltage-source' ? [element.positive, element.negative] : [element.from, element.to]; if (endpoints.some((node) => !circuit.nodes.includes(node))) throw new Error(`${element.id} references an unknown node.`); } }
function solveLinear(matrix: number[][], right: number[]) { const a = matrix.map((row, index) => [...row, right[index]]); const size = a.length; for (let column = 0; column < size; column++) { let pivot = column; for (let row = column + 1; row < size; row++) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row; if (Math.abs(a[pivot][column]) < 1e-14) throw new Error('Circuit matrix is singular; check ground and floating nodes.'); [a[column], a[pivot]] = [a[pivot], a[column]]; const divisor = a[column][column]; for (let entry = column; entry <= size; entry++) a[column][entry] /= divisor; for (let row = 0; row < size; row++) { if (row === column) continue; const factor = a[row][column]; for (let entry = column; entry <= size; entry++) a[row][entry] -= factor * a[column][entry]; } } return a.map((row) => row[size]); }
function validateTransient(first: number, second: number, time: number) { assertPositive(first, 'component value'); assertPositive(second, 'component value'); if (time < 0 || !Number.isFinite(time)) throw new Error('Time must be finite and nonnegative.'); }
function assertPositive(value: number, name: string) { if (!(value > 0) || !Number.isFinite(value)) throw new Error(`${name} must be finite and positive.`); }
function assertFinite(value: number, name: string) { if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`); }
