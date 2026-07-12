import { describe, expect, it } from "vitest";
import type { AIExtractionResult } from "./analysis-contract";
import {
  hasExplicitChoiceOverload,
  hasIndependentFirstActionAmbiguity,
  normalizeExtractionAgainstExplicitEpisodeFacts
} from "./extraction-normalizer";

function extraction(includeCompound = false): AIExtractionResult {
  const hypotheses: AIExtractionResult["hypothesisCandidates"] = [
    {
      id: "h-choice",
      code: "choice_overload",
      label: "選択過多",
      supportEvidenceIds: ["e-choice"],
      counterEvidenceIds: [],
      stateFactorEvidenceIds: [],
      unknowns: [],
      rationale: "複数候補が同時に重要に見えた。"
    },
    {
      id: "h-first",
      code: "unclear_first_action",
      label: "最初の操作が不明",
      supportEvidenceIds: ["e-first"],
      counterEvidenceIds: [],
      stateFactorEvidenceIds: [],
      unknowns: [],
      rationale: "何から始めるかという表現がある。"
    }
  ];
  if (includeCompound) {
    hypotheses.push({
      id: "h-compound",
      code: "compound",
      label: "複合",
      supportEvidenceIds: ["e-choice", "e-first"],
      counterEvidenceIds: [],
      stateFactorEvidenceIds: [],
      unknowns: [],
      rationale: "二つを統合する。"
    });
  }
  return {
    analysisVersion: "self-manual-v3",
    episodeId: "choice-dominance",
    evidence: [
      {
        id: "e-choice",
        kind: "reported_fact",
        statement: "全部が大事に見えた。",
        source: "current_user_text",
        verification: "user_reported"
      },
      {
        id: "e-first",
        kind: "reported_fact",
        statement: "何からやればよいか分からなかった。",
        source: "current_user_text",
        verification: "user_reported"
      }
    ],
    hypothesisCandidates: hypotheses,
    contradictions: [],
    additionalQuestions: [],
    interventionCandidates: hypotheses.map((hypothesis) => ({
      id: `i-${hypothesis.id}`,
      hypothesisId: hypothesis.id,
      instruction: "一つだけ表示する。",
      observableResult: "開始できたか。"
    })),
    safety: {
      isDiagnosis: false,
      containsMedicationAdvice: false,
      requiresHumanReview: false,
      reviewReason: null
    }
  };
}

describe("choice-overload dominance normalization", () => {
  it("recognizes overload but not a two-operation first-action choice", () => {
    expect(
      hasExplicitChoiceOverload("もう何からやればいいの、全部大事に見えて嫌になって閉じた。")
    ).toBe(true);
    expect(
      hasExplicitChoiceOverload("資料を開くのか見出しを作るのか決められなかった。")
    ).toBe(false);
  });

  it("removes subordinate first-action ambiguity and its intervention", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      extraction(),
      "もう何からやればいいの、全部大事に見えて嫌になって閉じた。"
    );
    expect(result.extraction.hypothesisCandidates.map((item) => item.code)).toEqual([
      "choice_overload"
    ]);
    expect(result.audit.appliedRuleCodes).toEqual([
      "explicit_choice_overload_subsumes_unclear_first_action"
    ]);
    expect(result.audit.removedHypothesisCodes).toEqual(["unclear_first_action"]);
    expect(result.audit.removedInterventionCount).toBe(1);
  });

  it("removes an orphaned compound after deduplication", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      extraction(true),
      "全部の候補が重要に見えて、何から始めるか決められなかった。"
    );
    expect(result.extraction.hypothesisCandidates.map((item) => item.code)).toEqual([
      "choice_overload"
    ]);
    expect(result.audit.appliedRuleCodes).toEqual([
      "explicit_choice_overload_subsumes_unclear_first_action",
      "orphaned_compound_removed_after_fact_conflict"
    ]);
  });

  it("preserves independent first-action ambiguity after narrowing", () => {
    const text = "候補が五つあり比較に迷った。さらに、一つに絞った後も最初の操作が分からなかった。";
    expect(hasExplicitChoiceOverload(text)).toBe(true);
    expect(hasIndependentFirstActionAmbiguity(text)).toBe(true);
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(extraction(), text);
    expect(result.extraction.hypothesisCandidates.map((item) => item.code)).toEqual([
      "choice_overload",
      "unclear_first_action"
    ]);
    expect(result.audit.appliedRuleCodes).toEqual([]);
  });
});
