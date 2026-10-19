/**
 * 14: what a battery's progress bar shows — the user's BEST finished attempt
 * (`best_attempt` from the API). Falls back to the last attempt only when it is
 * finished, so an attempt that was opened and abandoned never shows "0%".
 * Used by the process view and the assignment view alike.
 */
export function bestAttemptPercent(battery) {
  if (battery?.best_attempt?.percent != null) return Number(battery.best_attempt.percent);
  const last = battery?.last_attempt;
  return last && last.status === "finished" && last.percent != null ? Number(last.percent) : null;
}
