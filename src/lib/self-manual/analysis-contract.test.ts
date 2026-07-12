import { describe, expect, it } from "vitest";

import {
  aiExtractionSchema,
  deriveEvidenceIdsByKind,
  materializeHypothesisStates,
  resolveAIExtraction
} from "./analysis-contract";
import type { AIExtractionResult } from "./analysis-contract";
import { assessConfidence } from "./engine";
import type { EpisodeEvidence, InterventionTrial } from "./types";

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

  it("prioritizes a grounded compound candidate over its directly supported components", () => {
    const extraction = aiExtractionSchema.parse({
      analysisVersion: "self-manual-v3",
      episodeId: "compound-ranking",
      evidence: [
        {
          id: "e-choice",
          kind: "reported_fact",
          statement: "複数教材から一冊を選ぶ必要があった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "e-preparation",
          kind: "reported_fact",
          statement: "机を片づけて該当ページを探す必要があった",
          source: "behavior_log",
          verification: "observed"
        }
      ],
      hypothesisCandidates: [
        {
          id: "h-choice",
          code: "choice_overload",
          label: "選択過多",
          supportEvidenceIds: ["e-choice"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          rationale: "教材選択が必要だった"
        },
        {
          id: "h-preparation",
          code: "preparation_load",
          label: "準備負荷",
          supportEvidenceIds: ["e-preparation"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          rationale: "開始前の準備が必要だった"
        },
        {
          id: "h-compound",
          code: "compound",
          label: "選択と準備の複合",
          supportEvidenceIds: ["e-choice"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          rationale: "選択と準備が同時に開始を妨げた"
        }
      ],
      contradictions: [],
      additionalQuestions: [],
      interventionCandidates: [
        {
          id: "intervention-compound",
          hypothesisId: "h-compound",
          instruction: "使う教材一冊と開くページだけを先に表示する",
          observableResult: "表示後に開始できたか"
        }
      ],
      safety: normalSafety
    });

    const resolved = resolveAIExtraction(extraction);

    expect(resolved.rankedHypotheses[0].code).toBe("compound");
    expect(resolved.rankedHypotheses[0].priorityScore).toBeGreaterThan(
      resolved.rankedHypotheses[1].priorityScore
    );
    expect(resolved.selectedIntervention?.id).toBe("intervention-compound");
    expect(resolved.interventionAllowed).toBe(true);
    expect(
      resolved.auditReasons.rankIncreaseReasons.find(
        (item) => item.hypothesisId === "h-compound"
      )?.reasons
    ).toContain("直接支持された構成要因2件を統合する複合仮説を優先");
  });

  it("does not promote compound without two directly supported component candidates", () => {
    const extraction = makeResolutionCase();
    const strong = extraction.hypothesisCandidates.find(
      (candidate) => candidate.id === "h-strong"
    )!;

    extraction.hypothesisCandidates = [
      strong,
      {
        id: "h-single-compound",
        code: "compound",
        label: "根拠不足の複合候補",
        supportEvidenceIds: ["e-weak-support"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "一つの構成要因しか直接支持されていない"
      }
    ];
    extraction.interventionCandidates = [
      {
        id: "intervention-strong-only",
        hypothesisId: "h-strong",
        instruction: "最初の操作だけを表示する",
        observableResult: "開始できたか"
      }
    ];

    const resolved = resolveAIExtraction(aiExtractionSchema.parse(extraction));

    expect(resolved.rankedHypotheses[0].id).toBe("h-strong");
    expect(resolved.rankedHypotheses[0].code).toBe("unclear_first_action");
    expect(resolved.selectedIntervention?.id).toBe("intervention-strong-only");
  });

  it("materializes state-factor evidence IDs without a false separation penalty", () => {
    const extraction = aiExtractionSchema.parse({
      analysisVersion: "self-manual-v3",
      episodeId: "state-materialization",
      evidence: [
        {
          id: "e-state",
          kind: "state_factor",
          statement: "寝不足で疲れていた",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      hypothesisCandidates: [
        {
          id: "h-state",
          code: "state_load",
          label: "現在状態の負荷",
          supportEvidenceIds: ["e-state"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: ["e-state"],
          unknowns: [],
          rationale: "寝不足と疲労が明示されている"
        }
      ],
      contradictions: [],
      additionalQuestions: [],
      interventionCandidates: [
        {
          id: "i-state",
          hypothesisId: "h-state",
          instruction: "作業量を一つに減らす",
          observableResult: "一つに減らした後に開始できたか"
        }
      ],
      safety: normalSafety
    });
    const resolved = resolveAIExtraction(extraction);
    const state = materializeHypothesisStates(
      resolved,
      "2026-07-12T04:25:00.000Z"
    )[0];
    const evidence: EpisodeEvidence = {
      id: "e-state",
      episodeId: "state-materialization",
      source: "self_report",
      kind: "state_factor",
      statement: "寝不足で疲れていた",
      occurredAt: "2026-07-12T04:00:00.000Z",
      recordedAt: "2026-07-12T04:00:00.000Z",
      context: { contextKey: "study-home", taskType: "study" },
      userConfirmed: true,
      reliability: "medium"
    };

    const confidence = assessConfidence(state, [evidence], []);

    expect(state.stateFactorEvidenceIds).toEqual(["e-state"]);
    expect(state).not.toHaveProperty(["state", "Factors"].join(""));
    expect(confidence.negativeFactors.map((factor) => factor.code)).not.toContain(
      "state_not_separated"
    );
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
