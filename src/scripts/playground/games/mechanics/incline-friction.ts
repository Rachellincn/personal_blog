import { AtlasExperiment } from "../../core/atlas-experiment";
import { inclineFriction } from "../../atlas-i/dynamics-definitions";
export default class extends AtlasExperiment {
  constructor() {
    super(inclineFriction);
  }
}
