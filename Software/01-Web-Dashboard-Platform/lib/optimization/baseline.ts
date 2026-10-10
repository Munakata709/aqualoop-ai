import { decideFleetControl } from "@/lib/optimization/heuristic";
import { STRATEGIES } from "@/lib/optimization/strategies";
import type { ControllerContext } from "@/lib/optimization/types";
import type { FleetControlDecision } from "@/lib/simulation/engine";

/**
 * The "conventional operation" baseline: every eligible AWG runs whenever
 * its tank has room, independent of weather or energy source. This is the
 * explicit baseline that AI strategies are compared against — never claim
 * savings without comparing to this.
 */
export function baselineController(context: ControllerContext): FleetControlDecision {
  return decideFleetControl(context, STRATEGIES["fixed-schedule"]);
}
