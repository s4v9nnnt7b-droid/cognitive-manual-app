import { describe, expect, it } from "vitest";

import { selfManualExtractionSystemPrompt } from "./openai-responses-provider";

describe("self-manual extraction prompt contract", () => {
  it("requires supported component candidates plus compound only for distinct concurrent barriers", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "at least two causally distinct barriers are separately supported"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "Do not create compound for synonyms, downstream emotions, alternative explanations"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "Include each supported component candidate and also the compound candidate"
    );
  });

  it("separates first-action ambiguity, choice overload, and preparation load", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "Comparing a small number of possible first steps remains unclear_first_action"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "multiple tasks, materials, or options are simultaneously salient"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "gathering, arranging, clearing, locating, opening, or setting up materials"
    );
  });

  it("does not turn self-blame or downstream frustration into a new causal code", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "A self-blaming label such as \"lazy\" is a self_explanation"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "An emotional consequence such as frustration, annoyance"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "A voluntary priority choice is not a deficit and should not receive an intervention candidate"
    );
  });

  it("uses explicit known completion criteria as counterevidence to endpoint ambiguity", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "directly contradicted by an explicit known-condition statement"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "treat that as direct counterevidence and do not emit unclear_endpoint"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "fear of finding errors or discovering a problem"
    );
  });

  it("requires all directly stated components for explicit choice-plus-preparation episodes", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "emit choice_overload, preparation_load, and compound together"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "Do not omit either directly stated component"
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

  it("preserves comparison-based conflicts without premature intervention", () => {
    expect(selfManualExtractionSystemPrompt).toContain(
      "A positive contrast may support a hypothesis provisionally"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "ask exactly one focused question about the current failed task"
    );
    expect(selfManualExtractionSystemPrompt).toContain(
      "do not create intervention candidates yet"
    );
  });
});