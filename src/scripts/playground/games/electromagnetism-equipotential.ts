import ElectromagnetismAtlasExperiment from './electromagnetism-atlas';

export default class extends ElectromagnetismAtlasExperiment {
  constructor() {
    super({ id: 'electromagnetism-equipotential', name: 'Equipotential contours & potential', number: 'ATLAS EM 03', view: 'contours', preset: 'dipole' });
  }
}
