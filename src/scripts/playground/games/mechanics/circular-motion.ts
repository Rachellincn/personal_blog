import { AtlasExperiment } from "../../core/atlas-experiment";
import { circular } from "../../atlas-i/kinematics-definitions";
export default class extends AtlasExperiment {
  constructor() {
    super(circular);
  }
}
