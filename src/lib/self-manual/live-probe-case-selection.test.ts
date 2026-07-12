import { describe, expect, it } from "vitest";

import { selectLiveProbeCases } from "./live-probe-case-selection";

describe("live probe case selection", () => {
  it("keeps the restricted smoke priority order by default", () => {
    expect(selectLiveProbeCases(3, undefined).map((testCase) => testCase.id)).toEqual([
      "boundary-outside-taxonomy",
      "boundary-insufficient",
      "boundary-clear-first-action"
    ]);
  });

  it("selects only explicitly requested case IDs", () => {
    expect(selectLiveProbeCases(12, "boundary-compound").map((testCase) => testCase.id)).toEqual([
      "boundary-compound"
    ]);
  });

  it("rejects unknown case IDs", () => {
    expect(() => selectLiveProbeCases(12, "unknown-case")).toThrow(
      "Unknown LIVE_PROBE_CASE_IDS: unknown-case"
    );
  });
});
