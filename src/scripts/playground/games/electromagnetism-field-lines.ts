import ElectromagnetismAtlasExperiment from './electromagnetism-atlas';

export default class extends ElectromagnetismAtlasExperiment {
  constructor() {
    super({ id: 'electromagnetism-field-lines', name: 'Electric field lines', number: 'ATLAS EM 02', view: 'lines', preset: 'dipole' });
  }
}
