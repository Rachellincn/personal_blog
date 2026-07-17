import { CircuitAtlasExperiment } from './circuit-atlas';
export default class extends CircuitAtlasExperiment { constructor() { super({ kind: 'kirchhoff', id: 'electromagnetism-kirchhoff', name: 'Kirchhoff circuit solver', number: 'ATLAS EM 12' }); } }
