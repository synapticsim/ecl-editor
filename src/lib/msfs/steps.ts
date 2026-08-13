import type { Phase } from "../../checklist";

/** MSFS EFB `ChecklistStepId` enum — the 16 named checklist steps a `<Step>` can target. */
export type ChecklistStepId =
    // Preflight
    | "PREFLIGHT_GATE"
    | "PREFLIGHT_PUSHBACK"
    | "PREFLIGHT_TAXI_OUT"
    // Inflight
    | "FLIGHT_RUNWAY"
    | "FLIGHT_TAKEOFF"
    | "FLIGHT_CLIMB"
    | "FLIGHT_CRUISE"
    | "FLIGHT_DESCENT"
    | "LANDING_APPROACH"
    | "LANDING_APPROACH_VFR"
    | "LANDING_APPROACH_IFR"
    | "LANDING_FINAL"
    | "LANDING_TOUCHDOWN"
    // Postflight
    | "LANDING_GROUNDROLL"
    | "LANDING_TAXI_IN"
    | "LANDING_GATE";

/** Only three of the sixteen step ids are reachable from the editor's 3-value
 *  `phase` today. The rest of the union exists so a per-checklist override
 *  (letting an author pick a specific step) can slot in later without
 *  reworking the exporter or this table. */
export const PHASE_STEP: Record<Phase, ChecklistStepId> = {
    "pre-flight": "PREFLIGHT_GATE",
    "in-flight": "FLIGHT_CRUISE",
    "post-flight": "LANDING_GATE",
};

/** Used when a normal checklist has no `phase` set (warned by the exporter). */
export const DEFAULT_STEP: ChecklistStepId = "PREFLIGHT_GATE";
