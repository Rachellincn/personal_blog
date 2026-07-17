import { AtlasExperiment } from "../../core/atlas-experiment";
import { workEnergy } from "../../atlas-i/energy-definition";
export default class extends AtlasExperiment {
  constructor() {
    super(workEnergy);
  }
}
