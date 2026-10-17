import type { StatusKind } from "./ui";

/** Estados de run (`RunStatus`) na ordem do SA0 e o desenho de cada um ("um desenho por estado" da V4.6). */
export const RUN_STATES = ["queued", "running", "waiting_approval", "failed", "succeeded", "cancelled"] as const;
export type RunState = (typeof RUN_STATES)[number];

export const RUN_KIND: Record<string, StatusKind> = {
  queued: "pause",
  running: "prog",
  waiting_approval: "you",
  failed: "fail",
  succeeded: "done",
  cancelled: "block",
};
