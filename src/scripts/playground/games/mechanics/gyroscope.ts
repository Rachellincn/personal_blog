import { AtlasExperiment } from "../../core/atlas-experiment";
import { gyroscope } from "../../atlas-ii/rotation-definitions";
export default class extends AtlasExperiment { constructor() { super(gyroscope); } }
