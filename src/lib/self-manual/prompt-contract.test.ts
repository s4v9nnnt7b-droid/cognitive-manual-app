import { describe, expect, it } from "vitest";

import { selfManualExtractionSystemPrompt } from "./openai-responses-provider";

describe("self-manual extraction prompt contract", () => {
  it("requires supported component candidates plus compound for clearly mixed episodes", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "include each supported component candidate and also include a compound candidate"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "Do not collapse a clearly mixed episode to only one component or only the compound candidate"
    );
  });

  it("keeps ordinary sleep loss and fatigue inside state-load analysis", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "ordinary sleep loss, fatigue, anxiety, or task load"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "do not by themselves require human review"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "acute, severe, unexplained, or medically concerning physical symptoms"
    );
  });
});
