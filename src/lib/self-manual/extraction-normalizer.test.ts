import { describe, expect, it } from "vitest";

import type { AIExtractionResult } from "./analysis-contract";
import {
  hasExplicitChoiceOverload,
  hasExplicitKnownCompletionCondition,
  hasExplicitPreparationLoad,
  hasIndependentFirstActionAmbiguity,
  normalizeExtractionAgainstExplicitEpisodeFacts
} from "./extraction-normalizer";

const normalSafety = {
  isDiagnosis: false as const,
  containsMedicationAdvice: false as const,
  requiresHumanReview: false,
  reviewReason: null
};

function anxietyWithEndpoint(episodeId = "known-completion"): AIExtractionResult {
  return {
    analysisVersion: "self-manual-v3",
    episodeId,
    evidence: [
      {
        id: "e-known",
        kind: "reported_fact",
        statement: "完成条件は分かっている。",
        source: "current_user_text",
        verification: "user_reported"
      },
      {
        id: "e-fear",
        kind: "reported_fact",
        statement: "間違いが見つかりそうで怖かった。",
        source: "current_user_text",
        verification: "user_reported"
      }
    ],
    hypothesisCandidates: [
      {
        id: "h-anxiety",
        code: "anxiety_or_failure_avoidance",
        label: "失敗回避",
        supportEvidenceIds: ["e-fear"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "問題発見への恐怖が明示されている。"
      },
      {
        id: "h-endpoint",
        code: "unclear_endpoint",
        label: "終了条件の曖昧さ",
        supportEvidenceIds: ["e-known"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "終了条件に関する情報がある。"
      }
    ],
    contradictions: [],
    additionalQuestions: [],
    interventionCandidates: [
      {
        id: "i-anxiety",
        hypothesisId: "h-anxiety",
        instruction: "確認範囲を一箇所に限定して開く。",
        observableResult: "ファイルを開けたか。"
      },
      {
        id: "i-endpoint",
        hypothesisId: "h-endpoint",
        instruction: "終了条件を一行にする。",
        observableResult: "開始できたか。"
      }
    ],
    safety: normalSafety
  };
}

function preparationOnlyStudy(
  episodeId = "study-preparation-only"
): AIExtractionResult {
  return {
    analysisVersion: "self-manual-v3",
    episodeId,
    evidence: [
      {
        id: "e-preparation",
        kind: "reported_fact",
        statement: "机を片づけて該当ページを探す準備が必要だった。",
        source: "current_user_text",
        verification: "user_reported"
      }
    ],
    hypothesisCandidates: [
      {
        id: "h-preparation",
        code: "preparation_load",
        label: "準備負荷",
        supportEvidenceIds: ["e-preparation"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "開始前の準備が必要だった。"
      }
    ],
    contradictions: [],
    additionalQuestions: [],
    interventionCandidates: [
      {
        id: "i-preparation",
        hypothesisId: "h-preparation",
        instruction: "机を片づけ、該当ページだけを開く。",
        observableResult: "準備後に開始できたか。"
      }
    ],
    safety: normalSafety
  };
}

describe("explicit episode fact normalization", () => {
  it("removes endpoint ambiguity contradicted by an explicit known condition", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      anxietyWithEndpoint(),
      "完成条件は分かっているのに、間違いが見つかりそうで怖くて開けなかった。"
    );

    expect(result.extraction.hypothesisCandidates.map((candidate) => candidate.code)).toEqual([
      "anxiety_or_failure_avoidance"
    ]);
    expect(result.audit.appliedRuleCodes).toContain(
      "explicit_known_completion_excludes_unclear_endpoint"
    );
  });

  it("does not treat an unknown condition as known", () => {
    expect(hasExplicitKnownCompletionCondition("完成条件が分からず開けなかった。")).toBe(false);
  });

  it("recognizes choice overload, preparation load, and independent first-action ambiguity", () => {
    expect(
      hasExplicitChoiceOverload(
        "教材が何冊もあり、今日使う一冊を選ぶ必要があった。"
      )
    ).toBe(true);
    expect(
      hasExplicitPreparationLoad(
        "机を片づけて該当ページを探す準備が必要だった。"
      )
    ).toBe(true);
    expect(
      hasIndependentFirstActionAmbiguity(
        "候補を一つに絞った後も最初の操作が分からなかった。"
      )
    ).toBe(true);
  });

  it("restores an explicitly stated missing choice factor and compound candidate", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      preparationOnlyStudy(),
      "教材が何冊も積まれ、今日使う一冊を選び、机を片づけて該当ページを探す準備が必要だった。"
    );

    expect(
      result.extraction.hypothesisCandidates
        .map((candidate) => candidate.code)
        .sort()
    ).toEqual(["choice_overload", "compound", "preparation_load"]);
    expect(result.extraction.interventionCandidates.some((candidate) =>
      result.extraction.hypothesisCandidates.some(
        (hypothesis) =>
          hypothesis.code === "compound" &&
          hypothesis.id === candidate.hypothesisId
      )
    )).toBe(true);
    expect(result.audit.appliedRuleCodes).toEqual([
      "explicit_choice_overload_restores_missing_candidate",
      "explicit_multi_barrier_restores_compound"
    ]);
  });

  it("does not invent a multi-barrier set when the model extracted neither supported component", () => {
    const extraction = anxietyWithEndpoint("no-component");
    extraction.hypothesisCandidates = [
      extraction.hypothesisCandidates[0]
    ];
    extraction.interventionCandidates = [
      extraction.interventionCandidates[0]
    ];

    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      extraction,
      "教材が何冊もあり、机を片づける準備も必要だった。"
    );

    expect(result.extraction.hypothesisCandidates.map((candidate) => candidate.code)).toEqual([
      "anxiety_or_failure_avoidance"
    ]);
    expect(result.audit.appliedRuleCodes).toEqual([]);
  });

  it("does not restore preparation load without an explicit preparation statement", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      preparationOnlyStudy("no-explicit-preparation"),
      "教材が何冊もあり、今日使う一冊を選ぶ必要があった。"
    );

    expect(result.audit.appliedRuleCodes).toEqual([]);
  });
});
