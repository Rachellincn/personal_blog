import ElectromagnetismAtlasExperiment from './electromagnetism-atlas';

export default class extends ElectromagnetismAtlasExperiment {
  constructor() {
    super({ id: 'electromagnetism-multipoles', name: 'Electric dipoles & multipoles', number: 'ATLAS EM 04', view: 'magnitude', preset: 'quadrupole' });
  }
}
