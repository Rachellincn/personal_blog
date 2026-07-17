import { AtlasExperiment } from "../../core/atlas-experiment";
import { newtonFbd } from "../../atlas-i/dynamics-definitions";
export default class extends AtlasExperiment {
  constructor() {
    super(newtonFbd);
  }
}
