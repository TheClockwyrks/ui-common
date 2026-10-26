import type {
  ClimberStatus,
  DispatchStatus,
  LadderClimber,
} from "@clockwyrks/backend-api/ladders";

import { comboLabel } from "./comboLabels";

// What the ladder page reads off a climber beside its card: how its status pill reads,
// and what the board's search matches it on.

/**
 * How a climber's status pill reads under its dispatch: its own status, or stopped
 * for a climber a Stop caught while it was still running or blocked. The pill's
 * colour and the board's status filter both go by this, so the filter narrows to
 * exactly the pills that say what it says.
 */
export type ClimberStanding = ClimberStatus | "stopped";

/** Where a climber stands as its pill reads it. */
export function climberStanding(
  climber: LadderClimber,
  dispatch: DispatchStatus,
): ClimberStanding {
  return dispatch === "stopped" &&
    (climber.status === "running" || climber.status === "blocked")
    ? "stopped"
    : climber.status;
}

/**
 * What the board's search matches a climber on, lowercased: its heading as the card
 * spells it, and the raw fields under it (the harness, the model, the provider, the gg
 * configuration and every model it binds), so a climber is found by whichever of them
 * the reader remembers.
 */
export function climberSearchText(climber: LadderClimber): string {
  return [
    comboLabel(climber),
    climber.harness,
    climber.model,
    climber.provider ?? "",
    climber.ggConfigName ?? "",
    ...Object.values(climber.ggSlotModels ?? {}),
  ]
    .join(" ")
    .toLowerCase();
}
