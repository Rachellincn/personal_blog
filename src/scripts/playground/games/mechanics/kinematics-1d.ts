import { AtlasExperiment } from "../../core/atlas-experiment";
import { kinematics1D } from "../../atlas-i/kinematics-definitions";
export default class extends AtlasExperiment {
  constructor() {
    super(kinematics1D);
  }
}
