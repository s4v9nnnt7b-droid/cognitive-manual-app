import { describe, expect, it } from "vitest";
import { selfManualExtractionSystemPrompt } from "./openai-responses-provider";

describe("choice-overload prompt boundary", () => {
  it("does not duplicate first-action ambiguity when overload fully explains it", () => {
    expect(selfManualExtractionSystemPrompt).toContain("emit choice_overload only");
    expect(selfManualExtractionSystemPrompt).toContain(
      "unless a separate concrete-operation ambiguity remains after the choice is narrowed"
    );
  });
});
