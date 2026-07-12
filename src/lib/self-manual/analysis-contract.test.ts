import { describe, expect, it } from "vitest";

import {
  aiExtractionSchema,
  deriveEvidenceIdsByKind,
  materializeHypothesisStates,
  resolveAIExtraction
} from "./analysis-contract";
import type { AIExtractionResult } from "./analysis-contract";
import type { InterventionTrial } from "./types";

const normalSafety = {
  isDiagnosis: false as const,
  containsMedicationAdvice: false as const,
  requiresHumanReview: false,
  reviewReason: null
};

function makeResolutionCase(): AIExtractionResult {
  return aiExtractionSchema.parse({
    analysisVersion: "self-manual-v3",
    episodeId: "authority-boundary",
    evidence: [
      {
        id: "e-weak-support",
        kind: "reported_fact",
        statement: "本人は選択肢が多かったと報告した",
        source: "current_user_text",
        verification: "user_reported"
      },
      {
        id: "e-weak-counter",
        kind: "counterevidence",
        statement: "同じ選択肢でも直前には開始できていた",
        source: "behavior_log",
        verification: "verified"
      },
      {
        id: "e-strong-support",
        kind: "reported_fact",
        statement: "最初の操作が未確定のまま停止したことが観測された",
        source: "behavior_log",
        verification: "observed"
      }
    ],
    hypothesisCandidates: [
      {
        id: "h-weak",
        code: "choice_overload",
        label: "選択過多",
        supportEvidenceIds: ["e-weak-support"],
        counterEvidenceIds: ["e-weak-counter"],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "本人報告では候補が多かった"
      },
      {
        id: "h-strong",
        code: "unclear_first_action",
        label: "最初の操作が未確定",
        supportEvidenceIds: ["e-strong-support"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "観測上、最初の操作が決まらず停止した"
      }
    ],
    contradictions: [
      {
        id: "c-1",
        evidenceIds: ["e-weak-support", "e-weak-counter"],
        description: "本人説明と行動ログが一致していない"
      }
    ],
    additionalQuestions: [],
    interventionCandidates: [
      {
        id: "intervention-weak",
        hypothesisId: "h-weak",
        instruction: "候補を一件だけ表示する",
        observableResult: "開始できたか"
      },
      {
        id: "intervention-strong",
        hypothesisId: "h-strong",
        instruction: "最初の操作だけを一行で表示する",
        observableResult: "表示後に開始できたか"
      }
    ],
    safety: normalSafety
  });
}

describe("two-stage analysis resolver", () => {
  it("derives formal rank from evidence instead of candidate order", () => {
    const extraction = makeResolutionCase();
    const resolved = resolveAIExtraction(extraction);

    expect(extraction.hypothesisCandidates.map((candidate) => candidate.id)).toEqual([
      "h-weak",
      "h-strong"
    ]);
    expect(resolved.rankedHypotheses.map((hypothesis) => hypothesis.id)).toEqual([
      "h-strong",
      "h-weak"
    ]);
    expect(resolved.rankedHypotheses[0].rank).toBe(1);
    expect(resolved.selectedIntervention?.id).toBe("intervention-strong");
    expect(resolved.interventionAllowed).toBe(true);
  });

  it("uses evidence-based stages rather than a model-authored truth probability", () => {
    const resolved = resolveAIExtraction(makeResolutionCase());

    expect(resolved.evidenceBasedConfidenceStage).toBe("provisional");
    expect(["low", "provisional", "medium", "conditionally_high"]).toContain(
      resolved.evidenceBasedConfidenceStage
    );
    expect(resolved.rankedHypotheses[0].confidence.positiveFactors.length).toBeGreaterThan(0);
  });

  it("blocks formal intervention selection when leading hypotheses tie", () => {
    const extraction = makeResolutionCase();
    extraction.hypothesisCandidates = extraction.hypothesisCandidates.map((candidate) => ({
      ...candidate,
      supportEvidenceIds: ["e-weak-support"],
      counterEvidenceIds: [],
      unknowns: []
    }));
    extraction.interventionCandidates = extraction.hypothesisCandidates.map((candidate) => ({
      id: `intervention-${candidate.id}`,
      hypothesisId: candidate.id,
      instruction: "安全な小規模介入",
      observableResult: "開始できたか"
    }));

    const resolved = resolveAIExtraction(aiExtractionSchema.parse(extraction));

    expect(resolved.auditReasons.blockedReasons).toContain("leading_hypotheses_tied");
    expect(resolved.interventionAllowed).toBe(false);
    expect(resolved.selectedIntervention).toBeNull();
  });

  it("avoids intervention candidates rejected by prior trial evidence", () => {
    const extraction = makeResolutionCase();
    const rejectedTrial: InterventionTrial = {
      id: "trial-rejected",
      hypothesisId: "h-strong",
      interventionId: "intervention-strong",
      contextKey: "study-desk",
      taskType: "study",
      attempted: true,
      started: false,
      startDelayMinutes: null,
      sustainedFiveMinutes: null,
      subjectiveEase: 1,
      burden: 4,
      wouldUseAgain: false,
      outcome: "not_helped",
      failureReason: "intervention_mismatch",
      recordedAt: "2026-07-12T04:00:00.000Z"
    };
    extraction.interventionCandidates.push({
      id: "intervention-strong-alternative",
      hypothesisId: "h-strong",
      instruction: "資料ファイルを開くだけに限定する",
      observableResult: "ファイルを開けたか"
    });

    const resolved = resolveAIExtraction(aiExtractionSchema.parse(extraction), {
      trials: [rejectedTrial]
    });

    expect(resolved.selectedIntervention?.id).toBe("intervention-strong-alternative");
    expect(resolved.auditReasons.selectedInterventionReason).toContain("未試行を優先");
  });

  it("materializes formal hypothesis state only from the resolved result", () => {
    const resolved = resolveAIExtraction(makeResolutionCase());
    const states = materializeHypothesisStates(resolved, "2026-07-12T04:30:00.000Z");

    expect(states[0].id).toBe(resolved.rankedHypotheses[0].id);
    expect(states[0].rank).toBe(1);
    expect(states[0].confidence).toEqual(resolved.rankedHypotheses[0].confidence);
    expect(states[0].history[0].note).toContain("resolver-v1");
  });

  it("derives evidence views from the canonical evidence objects", () => {
    const extraction = makeResolutionCase();

    expect(deriveEvidenceIdsByKind(extraction, "reported_fact")).toEqual([
      "e-weak-support",
      "e-strong-support"
    ]);
    expect(extraction).not.toHaveProperty("factEvidenceIds");
    expect(extraction).not.toHaveProperty("selfExplanationEvidenceIds");
  });

  it("records an auditable and versioned resolution", () => {
    const resolved = resolveAIExtraction(makeResolutionCase());

    expect(resolved.resolutionVersion).toBe("resolver-v1");
    expect(resolved.auditReasons.resolutionRuleVersion).toBe("resolver-v1");
    expect(resolved.auditReasons.usedEvidenceIds).toContain("e-strong-support");
    expect(resolved.auditReasons.rankIncreaseReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hypothesisId: "h-strong" })
      ])
    );
    expect(resolved.auditReasons.rankDecreaseReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hypothesisId: "h-weak" })
      ])
    );
  });
});
