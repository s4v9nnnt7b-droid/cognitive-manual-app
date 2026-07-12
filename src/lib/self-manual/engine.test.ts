import { describe, expect, it } from "vitest";

import {
  applyInterventionTrial,
  applyUserCorrection,
  assessConfidence,
  createManualEntryIfEligible,
  evaluateManualPromotion
} from "./engine";
import { aiAnalysisSchema, interventionTrialSchema } from "./schemas";
import { contractTestMatrix } from "./test-matrix";
import type {
  EpisodeEvidence,
  HypothesisState,
  InterventionTrial,
  UserCorrection
} from "./types";

const now = "2026-07-12T00:00:00.000Z";

const emptyConfidence = {
  level: "low" as const,
  positiveFactors: [],
  negativeFactors: []
};

const makeHypothesis = (input: Partial<HypothesisState> & Pick<HypothesisState, "id" | "code">): HypothesisState => ({
  id: input.id,
  code: input.code,
  label: input.label ?? input.code,
  rank: input.rank ?? 1,
  priorityScore: input.priorityScore ?? 0,
  status: input.status ?? "active",
  supportEvidenceIds: input.supportEvidenceIds ?? [],
  counterEvidenceIds: input.counterEvidenceIds ?? [],
  unknowns: input.unknowns ?? [],
  stateFactors: input.stateFactors ?? [],
  confidence: input.confidence ?? emptyConfidence,
  history: input.history ?? []
});

const makeEvidence = (input: Partial<EpisodeEvidence> & Pick<EpisodeEvidence, "id">): EpisodeEvidence => ({
  id: input.id,
  episodeId: input.episodeId ?? "episode-1",
  source: input.source ?? "self_report",
  kind: input.kind ?? "support",
  statement: input.statement ?? "support",
  occurredAt: input.occurredAt ?? now,
  recordedAt: input.recordedAt ?? now,
  context: input.context ?? { contextKey: "study-home", taskType: "study" },
  userConfirmed: input.userConfirmed ?? null,
  reliability: input.reliability ?? "medium",
  stale: input.stale
});

const makeTrial = (
  id: string,
  input: Partial<InterventionTrial> = {}
): InterventionTrial => ({
  id,
  hypothesisId: input.hypothesisId ?? "hypothesis-primary",
  interventionId: input.interventionId ?? "show-first-action",
  contextKey: input.contextKey ?? "study-home",
  taskType: input.taskType ?? "study",
  attempted: input.attempted ?? true,
  started: input.started ?? true,
  startDelayMinutes: input.startDelayMinutes ?? 2,
  sustainedFiveMinutes: input.sustainedFiveMinutes ?? true,
  subjectiveEase: input.subjectiveEase ?? 4,
  burden: input.burden ?? 2,
  wouldUseAgain: input.wouldUseAgain ?? true,
  outcome: input.outcome ?? "helped",
  failureReason: input.failureReason ?? "none",
  recordedAt: input.recordedAt ?? now
});

describe("AI analysis contract", () => {
  it("keeps reported facts, self explanation, hypotheses, unknowns, and safety separated", () => {
    const parsed = aiAnalysisSchema.parse({
      analysisVersion: "self-manual-v2",
      episodeId: "episode-1",
      evidence: [
        {
          id: "evidence-fact",
          kind: "reported_fact",
          statement: "教材を開かなかった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "evidence-self-explanation",
          kind: "self_explanation",
          statement: "怠けていると思う",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["evidence-fact"],
      selfExplanationEvidenceIds: ["evidence-self-explanation"],
      hypotheses: [
        {
          id: "hypothesis-unknown",
          rank: 1,
          code: "insufficient_information",
          label: "情報不足",
          supportEvidenceIds: ["evidence-fact"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["止まった時点"],
          confidence: "low",
          rationale: "原因を区別する情報が足りない"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["どの時点で止まりましたか"],
      recommendedIntervention: null,
      safety: {
        isDiagnosis: false,
        containsMedicationAdvice: false,
        requiresHumanReview: false,
        reviewReason: null
      }
    });

    expect(parsed.factEvidenceIds).toEqual(["evidence-fact"]);
    expect(parsed.selfExplanationEvidenceIds).toEqual(["evidence-self-explanation"]);
  });

  it("rejects an unknown path without exactly one next confirmation question", () => {
    const result = aiAnalysisSchema.safeParse({
      analysisVersion: "self-manual-v2",
      episodeId: "episode-1",
      evidence: [
        {
          id: "evidence-input",
          kind: "reported_fact",
          statement: "なんとなくできなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["evidence-input"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "hypothesis-unknown",
          rank: 1,
          code: "unknown",
          label: "現時点では不明",
          supportEvidenceIds: ["evidence-input"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["原因"],
          confidence: "low",
          rationale: "情報不足"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: null,
      safety: {
        isDiagnosis: false,
        containsMedicationAdvice: false,
        requiresHumanReview: false,
        reviewReason: null
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects contradictory intervention trial fields", () => {
    const result = interventionTrialSchema.safeParse({
      ...makeTrial("trial-invalid"),
      attempted: false,
      outcome: "helped",
      failureReason: "none"
    });

    expect(result.success).toBe(false);
  });
});

describe("user correction state transition", () => {
  it("demotes the leading hypothesis, promotes the alternative, and preserves correction history", () => {
    const correctionEvidence = makeEvidence({
      id: "evidence-correction",
      source: "user_correction",
      kind: "correction",
      statement: "最初の手順は分かっていたので、その説明は違う",
      userConfirmed: true,
      reliability: "high"
    });
    const hypotheses = [
      makeHypothesis({
        id: "hypothesis-primary",
        code: "unclear_first_action",
        rank: 1,
        priorityScore: 10
      }),
      makeHypothesis({
        id: "hypothesis-alternative",
        code: "state_load",
        rank: 2,
        priorityScore: 8
      })
    ];
    const correction: UserCorrection = {
      id: "correction-1",
      hypothesisId: "hypothesis-primary",
      response: "wrong",
      reason: "最初の手順は分かっていた",
      evidenceId: correctionEvidence.id,
      correctedAt: now
    };

    const updated = applyUserCorrection(hypotheses, correction, [correctionEvidence], []);
    const leading = updated.find((hypothesis) => hypothesis.rank === 1);
    const corrected = updated.find((hypothesis) => hypothesis.id === "hypothesis-primary");

    expect(leading?.id).toBe("hypothesis-alternative");
    expect(corrected?.status).toBe("demoted");
    expect(corrected?.counterEvidenceIds).toContain("evidence-correction");
    expect(corrected?.history.some((event) => event.type === "user_corrected")).toBe(true);
    expect(corrected?.confidence.level).toBe("low");
  });
});

describe("intervention trial transitions", () => {
  it("does not penalize a hypothesis when the intervention was not attempted", () => {
    const hypothesis = makeHypothesis({
      id: "hypothesis-primary",
      code: "unclear_first_action",
      priorityScore: 5
    });
    const trial = makeTrial("trial-not-attempted", {
      attempted: false,
      started: false,
      startDelayMinutes: null,
      sustainedFiveMinutes: null,
      subjectiveEase: null,
      burden: null,
      wouldUseAgain: null,
      outcome: "not_attempted",
      failureReason: "not_attempted"
    });

    const updated = applyInterventionTrial([hypothesis], trial, [], [trial]);

    expect(updated[0].priorityScore).toBe(5);
    expect(updated[0].history.at(-1)?.type).toBe("trial_not_attempted");
  });

  it("separates state effects from a wrong causal hypothesis", () => {
    const hypothesis = makeHypothesis({
      id: "hypothesis-primary",
      code: "unclear_first_action",
      priorityScore: 5
    });
    const stateTrial = makeTrial("trial-state", {
      outcome: "not_helped",
      started: false,
      failureReason: "state_factor"
    });
    const mismatchTrial = makeTrial("trial-mismatch", {
      outcome: "not_helped",
      started: false,
      failureReason: "hypothesis_mismatch"
    });

    const afterState = applyInterventionTrial([hypothesis], stateTrial, [], [stateTrial]);
    const afterMismatch = applyInterventionTrial([hypothesis], mismatchTrial, [], [mismatchTrial]);

    expect(afterState[0].priorityScore).toBe(5);
    expect(afterMismatch[0].priorityScore).toBe(2);
    expect(afterMismatch[0].status).toBe("demoted");
  });
});

describe("confidence stages", () => {
  it("reaches conditionally high only after repeated and cross-context evidence", () => {
    const evidence = [
      makeEvidence({ id: "support-self", source: "self_report", userConfirmed: true }),
      makeEvidence({ id: "support-log", source: "behavior_log", userConfirmed: true })
    ];
    const hypothesis = makeHypothesis({
      id: "hypothesis-primary",
      code: "unclear_first_action",
      supportEvidenceIds: evidence.map((item) => item.id)
    });
    const trials = [
      makeTrial("trial-1"),
      makeTrial("trial-2"),
      makeTrial("trial-3"),
      makeTrial("trial-4"),
      makeTrial("trial-5"),
      makeTrial("trial-6", { contextKey: "study-coworking" })
    ];

    const confidence = assessConfidence(hypothesis, evidence, trials);

    expect(confidence.level).toBe("conditionally_high");
    expect(confidence.positiveFactors.map((factor) => factor.code)).toContain(
      "cross_context_replication"
    );
  });
});

describe("ManualEntry promotion gate", () => {
  const hypothesis = makeHypothesis({
    id: "hypothesis-primary",
    code: "unclear_first_action"
  });

  it("keeps a two-out-of-three result provisional and outside the manual", () => {
    const trials = [
      makeTrial("trial-1"),
      makeTrial("trial-2"),
      makeTrial("trial-3", {
        outcome: "not_helped",
        started: false,
        failureReason: "intervention_mismatch"
      })
    ];

    const decision = evaluateManualPromotion(trials);
    const entry = createManualEntryIfEligible({
      id: "manual-1",
      interventionId: "show-first-action",
      hypothesis,
      scope: "自宅での勉強開始",
      effectiveConditions: ["教材が一冊だけ見えている"],
      ineffectiveConditions: [],
      trials,
      at: now
    });

    expect(decision.status).toBe("provisional");
    expect(decision.eligible).toBe(false);
    expect(entry).toBeNull();
  });

  it("creates a manual entry only after repeated success across contexts", () => {
    const trials = [
      makeTrial("trial-1"),
      makeTrial("trial-2"),
      makeTrial("trial-3"),
      makeTrial("trial-4"),
      makeTrial("trial-5", { contextKey: "study-coworking" })
    ];

    const entry = createManualEntryIfEligible({
      id: "manual-validated",
      interventionId: "show-first-action",
      hypothesis,
      scope: "勉強開始",
      effectiveConditions: ["自宅", "コワーキング", "自宅"],
      ineffectiveConditions: [],
      trials,
      at: now
    });

    expect(entry?.status).toBe("validated");
    expect(entry?.confidence).toBe("conditionally_high");
    expect(entry?.effectiveConditions).toEqual(["自宅", "コワーキング"]);
  });
});

describe("contract regression matrix", () => {
  it("contains boundary, realistic, and paraphrase cases", () => {
    const groups = new Set(contractTestMatrix.map((testCase) => testCase.group));

    expect(contractTestMatrix).toHaveLength(12);
    expect(groups).toEqual(new Set(["boundary", "realistic", "paraphrase"]));
  });
});
