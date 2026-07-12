import { describe, expect, it } from "vitest";

import type { AIExtractionResult } from "./analysis-contract";
import {
  hasExplicitKnownCompletionCondition,
  normalizeExtractionAgainstExplicitEpisodeFacts
} from "./extraction-normalizer";

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
    safety: {
      isDiagnosis: false,
      containsMedicationAdvice: false,
      requiresHumanReview: false,
      reviewReason: null
    }
  };
}

describe("explicit episode fact conflict normalization", () => {
  it("recognizes an explicit known completion condition", () => {
    expect(
      hasExplicitKnownCompletionCondition(
        "完成条件は分かっているのに、間違いが見つかりそうで怖くて開けなかった。"
      )
    ).toBe(true);
  });

  it("does not treat an unknown or later-qualified condition as known", () => {
    expect(hasExplicitKnownCompletionCondition("完成条件が分からず開けなかった。")).toBe(false);
    expect(
      hasExplicitKnownCompletionCondition(
        "完成条件は分かっていると思ったが、実際は曖昧だった。"
      )
    ).toBe(false);
  });

  it("removes a directly contradicted endpoint candidate and its intervention", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      anxietyWithEndpoint(),
      "提出物を開くと間違いが見つかりそうで怖く、完成条件は分かっているのにファイルを開けなかった。"
    );

    expect(result.extraction.hypothesisCandidates.map((candidate) => candidate.code)).toEqual([
      "anxiety_or_failure_avoidance"
    ]);
    expect(result.extraction.interventionCandidates.map((candidate) => candidate.id)).toEqual([
      "i-anxiety"
    ]);
    expect(result.audit).toEqual({
      appliedRuleCodes: ["explicit_known_completion_excludes_unclear_endpoint"],
      removedHypothesisCodes: ["unclear_endpoint"],
      removedInterventionCount: 1
    });
  });

  it("keeps endpoint ambiguity when the episode explicitly says it is unknown", () => {
    const result = normalizeExtractionAgainstExplicitEpisodeFacts(
      anxietyWithEndpoint("unknown-completion"),
      "完成条件が分からず、間違いも怖くて開けなかった。"
    );

    expect(result.extraction.hypothesisCandidates).toHaveLength(2);
    expect(result.audit.appliedRuleCodes).toEqual([]);
  });
});
