import { describe, expect, it } from "vitest";

import type { AIExtractionResult } from "./analysis-contract";
import {
  validateLiveExtractionSemantics,
  withLiveProviderGuards
} from "./live-provider-guard";
import type { StructuredExtractionProvider } from "./runtime-probe";

function extraction(episodeId = "case-1"): AIExtractionResult {
  return {
    analysisVersion: "self-manual-v3",
    episodeId,
    evidence: [
      {
        id: "e-user",
        kind: "reported_fact",
        statement: "本人の報告。",
        source: "current_user_text",
        verification: "user_reported"
      },
      {
        id: "e-log",
        kind: "reported_fact",
        statement: "行動ログの観測。",
        source: "behavior_log",
        verification: "observed"
      }
    ],
    hypothesisCandidates: [
      {
        id: "h-1",
        code: "unclear_first_action",
        label: "最初の操作が不明確",
        supportEvidenceIds: ["e-user", "e-log"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "開始停止を示す情報がある。"
      }
    ],
    contradictions: [],
    additionalQuestions: [],
    interventionCandidates: [],
    safety: {
      isDiagnosis: false,
      containsMedicationAdvice: false,
      requiresHumanReview: false,
      reviewReason: null
    }
  };
}

const request = {
  episodeId: "case-1",
  minimizedText: "始められなかった。",
  attempt: 1
};

describe("live provider extraction guard", () => {
  it("accepts correlated output with valid verification", () => {
    expect(validateLiveExtractionSemantics(extraction(), request)).toEqual([]);
  });

  it("rejects response/request episode mismatch", () => {
    expect(validateLiveExtractionSemantics(extraction("other"), request)).toContainEqual({
      path: "episodeId",
      rule: "response_episode_id_must_match_request"
    });
  });

  it("rejects verification inflation from current user text", () => {
    const value = extraction();
    value.evidence[0] = { ...value.evidence[0], verification: "verified" };
    expect(validateLiveExtractionSemantics(value, request)).toContainEqual({
      path: "evidence.0.verification",
      rule: "verification_not_allowed_for_current_user_text"
    });
  });

  it("blocks invalid output through the guarded provider", async () => {
    const provider: StructuredExtractionProvider = {
      providerName: "fixture-provider",
      model: "fixture-model",
      apiRetrievalStorageRequested: false,
      async extract() {
        return extraction("other");
      }
    };

    await expect(withLiveProviderGuards(provider).extract(request)).rejects.toMatchObject({
      kind: "schema_validation",
      retryable: true
    });
  });
});
