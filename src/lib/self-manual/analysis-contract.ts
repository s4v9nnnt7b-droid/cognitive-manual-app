import { z } from "zod";

import { confidenceLevels, hypothesisCodes } from "./types";
import type {
  ConfidenceAssessment,
  ConfidenceFactor,
  ConfidenceLevel,
  HypothesisCode,
  HypothesisState,
  InterventionTrial
} from "./types";

export const analysisEvidenceKinds = [
  "reported_fact",
  "self_explanation",
  "state_factor",
  "counterevidence",
  "user_correction"
] as const;

export const analysisEvidenceSources = [
  "current_user_text",
  "existing_record",
  "behavior_log",
  "formal_test",
  "observer_feedback"
] as const;

export const verificationStatuses = ["user_reported", "observed", "verified", "unverified"] as const;

export const analysisEvidenceSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(analysisEvidenceKinds),
    statement: z.string().min(1),
    source: z.enum(analysisEvidenceSources),
    verification: z.enum(verificationStatuses)
  })
  .strict();

export const analysisHypothesisCandidateSchema = z
  .object({
    id: z.string().min(1),
    code: z.enum(hypothesisCodes),
    label: z.string().min(1),
    supportEvidenceIds: z.array(z.string().min(1)),
    counterEvidenceIds: z.array(z.string().min(1)),
    stateFactorEvidenceIds: z.array(z.string().min(1)),
    unknowns: z.array(z.string().min(1)),
    rationale: z.string().min(1)
  })
  .strict();

export const contradictionCandidateSchema = z
  .object({
    id: z.string().min(1),
    evidenceIds: z.array(z.string().min(1)).min(2),
    description: z.string().min(1)
  })
  .strict();

export const interventionCandidateSchema = z
  .object({
    id: z.string().min(1),
    hypothesisId: z.string().min(1),
    instruction: z.string().min(1),
    observableResult: z.string().min(1)
  })
  .strict();

const unknownHypothesisCodes = new Set<HypothesisCode>([
  "insufficient_information",
  "unknown",
  "outside_taxonomy"
]);

export const aiExtractionSchema = z
  .object({
    analysisVersion: z.literal("self-manual-v3"),
    episodeId: z.string().min(1),
    evidence: z.array(analysisEvidenceSchema).min(1),
    hypothesisCandidates: z.array(analysisHypothesisCandidateSchema).min(1).max(5),
    contradictions: z.array(contradictionCandidateSchema),
    additionalQuestions: z.array(z.string().min(1)).max(1),
    interventionCandidates: z.array(interventionCandidateSchema).max(5),
    safety: z
      .object({
        isDiagnosis: z.literal(false),
        containsMedicationAdvice: z.literal(false),
        requiresHumanReview: z.boolean(),
        reviewReason: z.string().min(1).nullable()
      })
      .strict()
  })
  .strict()
  .superRefine((analysis, context) => {
    const evidenceById = new Map(analysis.evidence.map((evidence) => [evidence.id, evidence]));
    const hypothesisById = new Map(
      analysis.hypothesisCandidates.map((hypothesis) => [hypothesis.id, hypothesis])
    );
    const interventionById = new Map(
      analysis.interventionCandidates.map((intervention) => [intervention.id, intervention])
    );

    if (evidenceById.size !== analysis.evidence.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "Evidence IDs must be unique."
      });
    }

    if (hypothesisById.size !== analysis.hypothesisCandidates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hypothesisCandidates"],
        message: "Hypothesis candidate IDs must be unique."
      });
    }

    if (interventionById.size !== analysis.interventionCandidates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interventionCandidates"],
        message: "Intervention candidate IDs must be unique."
      });
    }

    const validateEvidenceReferences = (ids: string[], path: (string | number)[]) => {
      for (const id of ids) {
        if (!evidenceById.has(id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `Evidence reference ${id} does not exist.`
          });
        }
      }
    };

    analysis.hypothesisCandidates.forEach((hypothesis, index) => {
      validateEvidenceReferences(hypothesis.supportEvidenceIds, [
        "hypothesisCandidates",
        index,
        "supportEvidenceIds"
      ]);
      validateEvidenceReferences(hypothesis.counterEvidenceIds, [
        "hypothesisCandidates",
        index,
        "counterEvidenceIds"
      ]);
      validateEvidenceReferences(hypothesis.stateFactorEvidenceIds, [
        "hypothesisCandidates",
        index,
        "stateFactorEvidenceIds"
      ]);

      for (const id of hypothesis.stateFactorEvidenceIds) {
        if (evidenceById.get(id)?.kind !== "state_factor") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["hypothesisCandidates", index, "stateFactorEvidenceIds"],
            message: "stateFactorEvidenceIds may reference only state_factor evidence."
          });
        }
      }
    });

    analysis.contradictions.forEach((contradiction, index) => {
      validateEvidenceReferences(contradiction.evidenceIds, [
        "contradictions",
        index,
        "evidenceIds"
      ]);
    });

    analysis.interventionCandidates.forEach((intervention, index) => {
      const target = hypothesisById.get(intervention.hypothesisId);
      if (!target) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["interventionCandidates", index, "hypothesisId"],
          message: "An intervention candidate must target a hypothesis candidate in the analysis."
        });
      } else if (unknownHypothesisCodes.has(target.code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["interventionCandidates", index],
          message: "Unknown, insufficient-information, and outside-taxonomy candidates cannot receive interventions."
        });
      }
    });

    const allCandidatesUnknown = analysis.hypothesisCandidates.every((hypothesis) =>
      unknownHypothesisCodes.has(hypothesis.code)
    );
    if (allCandidatesUnknown) {
      if (analysis.additionalQuestions.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["additionalQuestions"],
          message: "An all-unknown extraction must include exactly one next confirmation question."
        });
      }
      if (analysis.interventionCandidates.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["interventionCandidates"],
          message: "An all-unknown extraction cannot contain intervention candidates."
        });
      }
    }

    const usesOutsideTaxonomy = analysis.hypothesisCandidates.some(
      (hypothesis) => hypothesis.code === "outside_taxonomy"
    );
    if (usesOutsideTaxonomy && !analysis.safety.requiresHumanReview) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["safety", "requiresHumanReview"],
        message: "Outside-taxonomy output requires human review."
      });
    }

    if (analysis.safety.requiresHumanReview && analysis.safety.reviewReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["safety", "reviewReason"],
        message: "Human review requires a reason."
      });
    }

    if (!analysis.safety.requiresHumanReview && analysis.safety.reviewReason !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["safety", "reviewReason"],
        message: "reviewReason must be null when human review is not required."
      });
    }
  });

export type AIExtractionResult = z.infer<typeof aiExtractionSchema>;
export type AnalysisEvidence = z.infer<typeof analysisEvidenceSchema>;
export type AnalysisHypothesisCandidate = z.infer<typeof analysisHypothesisCandidateSchema>;
export type InterventionCandidate = z.infer<typeof interventionCandidateSchema>;

export type ResolvedHypothesis = {
  id: string;
  code: HypothesisCode;
  label: string;
  rank: number;
  priorityScore: number;
  supportEvidenceIds: string[];
  counterEvidenceIds: string[];
  stateFactorEvidenceIds: string[];
  unknowns: string[];
  confidence: ConfidenceAssessment;
  rationale: string;
};

export type ResolutionAudit = {
  usedEvidenceIds: string[];
  excludedEvidence: Array<{ evidenceId: string; reason: string }>;
  rankIncreaseReasons: Array<{ hypothesisId: string; reasons: string[] }>;
  rankDecreaseReasons: Array<{ hypothesisId: string; reasons: string[] }>;
  selectedInterventionReason: string | null;
  blockedReasons: string[];
  resolutionRuleVersion: "resolver-v1";
};

export type ResolvedAnalysis = {
  resolutionVersion: "resolver-v1";
  episodeId: string;
  rankedHypotheses: ResolvedHypothesis[];
  evidenceBasedConfidenceStage: ConfidenceLevel;
  selectedIntervention: InterventionCandidate | null;
  interventionAllowed: boolean;
  humanReviewRequired: boolean;
  additionalQuestion: string | null;
  auditReasons: ResolutionAudit;
};

type ResolutionOptions = {
  trials?: InterventionTrial[];
  resolvedAt?: string;
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const verificationWeight = (verification: AnalysisEvidence["verification"]): number => {
  if (verification === "verified") return 3;
  if (verification === "observed") return 2;
  if (verification === "user_reported") return 1;
  return 0;
};

const makeFactor = (
  code: ConfidenceFactor["code"],
  direction: ConfidenceFactor["direction"],
  weight: ConfidenceFactor["weight"],
  reason: string,
  evidenceIds: string[]
): ConfidenceFactor => ({ code, direction, weight, reason, evidenceIds });

export function deriveEvidenceIdsByKind(
  extraction: AIExtractionResult,
  kind: AnalysisEvidence["kind"]
): string[] {
  return extraction.evidence.filter((evidence) => evidence.kind === kind).map((evidence) => evidence.id);
}

function assessCandidateConfidence(
  candidate: AnalysisHypothesisCandidate,
  evidenceById: Map<string, AnalysisEvidence>
): ConfidenceAssessment {
  const support = candidate.supportEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is AnalysisEvidence => Boolean(item));
  const counter = candidate.counterEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is AnalysisEvidence => Boolean(item));
  const positiveFactors: ConfidenceFactor[] = [];
  const negativeFactors: ConfidenceFactor[] = [];
  const distinctSources = new Set(support.map((item) => item.source)).size;
  const verifiedOrObserved = support.filter(
    (item) => item.verification === "verified" || item.verification === "observed"
  );

  if (support.some((item) => item.verification === "verified")) {
    positiveFactors.push(
      makeFactor(
        "independent_sources_agree",
        "up",
        distinctSources >= 2 ? 2 : 1,
        "確認済みまたは観測済みの支持証拠がある。",
        verifiedOrObserved.map((item) => item.id)
      )
    );
  } else if (support.length > 0) {
    positiveFactors.push(
      makeFactor(
        "user_confirmed",
        "up",
        1,
        "本人報告による支持情報がある。",
        support.map((item) => item.id)
      )
    );
  }

  const correctionSupport = support.filter((item) => item.kind === "user_correction");
  if (correctionSupport.length > 0) {
    positiveFactors.push(
      makeFactor(
        "user_confirmed",
        "up",
        2,
        "本人訂正がこの候補を支持している。",
        correctionSupport.map((item) => item.id)
      )
    );
  }

  if (counter.length > 0) {
    negativeFactors.push(
      makeFactor(
        "strong_counterevidence",
        "down",
        counter.some((item) => item.verification === "verified" || item.verification === "observed")
          ? 3
          : 2,
        "反証または矛盾する証拠がある。",
        counter.map((item) => item.id)
      )
    );
  }

  if (candidate.unknowns.length > 0) {
    negativeFactors.push(
      makeFactor(
        "insufficient_information",
        "down",
        candidate.unknowns.length >= 2 ? 2 : 1,
        "未確認事項が残っている。",
        []
      )
    );
  }

  if (unknownHypothesisCodes.has(candidate.code) || support.length === 0) {
    negativeFactors.push(
      makeFactor(
        "insufficient_information",
        "down",
        2,
        "現時点では正式判定に必要な支持情報が不足している。",
        []
      )
    );
  }

  let level: ConfidenceLevel = "low";
  if (
    !unknownHypothesisCodes.has(candidate.code) &&
    verifiedOrObserved.length >= 2 &&
    distinctSources >= 2 &&
    counter.length === 0 &&
    candidate.unknowns.length === 0
  ) {
    level = "medium";
  } else if (!unknownHypothesisCodes.has(candidate.code) && support.length > 0 && counter.length === 0) {
    level = "provisional";
  }

  return { level, positiveFactors, negativeFactors };
}

function candidateScore(
  candidate: AnalysisHypothesisCandidate,
  evidenceById: Map<string, AnalysisEvidence>
): { score: number; increases: string[]; decreases: string[] } {
  const support = candidate.supportEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is AnalysisEvidence => Boolean(item));
  const counter = candidate.counterEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is AnalysisEvidence => Boolean(item));
  const stateFactors = candidate.stateFactorEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is AnalysisEvidence => Boolean(item));

  const supportWeight = support.reduce((total, item) => total + verificationWeight(item.verification), 0);
  const counterWeight = counter.reduce((total, item) => total + verificationWeight(item.verification), 0);
  const correctionSupport = support.filter((item) => item.kind === "user_correction").length * 2;
  const correctionCounter = counter.filter((item) => item.kind === "user_correction").length * 2;
  const stateFit =
    stateFactors.length > 0 && (candidate.code === "state_load" || candidate.code === "compound") ? 2 : 0;
  const unknownPenalty = Math.min(candidate.unknowns.length, 3);
  const unknownCodePenalty = unknownHypothesisCodes.has(candidate.code) ? 2 : 0;

  const increases: string[] = [];
  const decreases: string[] = [];
  if (supportWeight > 0) increases.push(`支持証拠の重み=${supportWeight}`);
  if (correctionSupport > 0) increases.push("本人訂正が候補を支持");
  if (stateFit > 0) increases.push("状態要因と候補分類が一致");
  if (counterWeight > 0) decreases.push(`反証の重み=${counterWeight}`);
  if (correctionCounter > 0) decreases.push("本人訂正が候補に反する");
  if (unknownPenalty > 0) decreases.push(`未確認事項=${candidate.unknowns.length}件`);
  if (unknownCodePenalty > 0) decreases.push("不明・情報不足・分類外の保留候補");

  return {
    score:
      supportWeight + correctionSupport + stateFit - counterWeight - correctionCounter - unknownPenalty - unknownCodePenalty,
    increases,
    decreases
  };
}

export function resolveAIExtraction(
  rawExtraction: AIExtractionResult,
  options: ResolutionOptions = {}
): ResolvedAnalysis {
  const extraction = aiExtractionSchema.parse(rawExtraction);
  const evidenceById = new Map(extraction.evidence.map((evidence) => [evidence.id, evidence]));
  const scored = extraction.hypothesisCandidates.map((candidate) => {
    const scoring = candidateScore(candidate, evidenceById);
    return {
      candidate,
      ...scoring,
      confidence: assessCandidateConfidence(candidate, evidenceById)
    };
  });

  const compoundItem = scored.find((item) => item.candidate.code === "compound");
  const directlySupportedComponentItems = scored.filter(
    (item) =>
      item.candidate.code !== "compound" &&
      !unknownHypothesisCodes.has(item.candidate.code) &&
      (item.candidate.supportEvidenceIds.length > 0 ||
        item.candidate.stateFactorEvidenceIds.length > 0)
  );
  const compoundIsGrounded =
    compoundItem !== undefined &&
    (compoundItem.candidate.supportEvidenceIds.length > 0 ||
      compoundItem.candidate.stateFactorEvidenceIds.length > 0);

  if (compoundItem && compoundIsGrounded && directlySupportedComponentItems.length >= 2) {
    const strongestComponentScore = Math.max(
      ...directlySupportedComponentItems.map((item) => item.score)
    );
    if (compoundItem.score <= strongestComponentScore) {
      compoundItem.score = strongestComponentScore + 1;
      compoundItem.increases.push(
        `直接支持された構成要因${directlySupportedComponentItems.length}件を統合する複合仮説を優先`
      );
    }
  }

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.candidate.code !== right.candidate.code) {
      return left.candidate.code.localeCompare(right.candidate.code);
    }
    return left.candidate.id.localeCompare(right.candidate.id);
  });

  const rankedHypotheses: ResolvedHypothesis[] = scored.map((item, index) => ({
    id: item.candidate.id,
    code: item.candidate.code,
    label: item.candidate.label,
    rank: index + 1,
    priorityScore: item.score,
    supportEvidenceIds: item.candidate.supportEvidenceIds,
    counterEvidenceIds: item.candidate.counterEvidenceIds,
    stateFactorEvidenceIds: item.candidate.stateFactorEvidenceIds,
    unknowns: item.candidate.unknowns,
    confidence: item.confidence,
    rationale: item.candidate.rationale
  }));

  const primary = rankedHypotheses[0];
  const topTie = rankedHypotheses.length > 1 && rankedHypotheses[0].priorityScore === rankedHypotheses[1].priorityScore;
  const blockedReasons: string[] = [];
  const humanReviewRequired =
    extraction.safety.requiresHumanReview || primary.code === "outside_taxonomy";

  if (humanReviewRequired) blockedReasons.push("human_review_required");
  if (unknownHypothesisCodes.has(primary.code)) blockedReasons.push("primary_hypothesis_unresolved");
  if (topTie) blockedReasons.push("leading_hypotheses_tied");

  const trials = options.trials ?? [];
  const rejectedInterventionIds = new Set(
    trials
      .filter(
        (trial) =>
          trial.failureReason === "intervention_mismatch" || trial.failureReason === "hypothesis_mismatch"
      )
      .map((trial) => trial.interventionId)
  );
  const attemptedInterventionIds = new Set(
    trials.filter((trial) => trial.attempted).map((trial) => trial.interventionId)
  );
  const eligibleInterventions = extraction.interventionCandidates
    .filter((candidate) => candidate.hypothesisId === primary.id)
    .filter((candidate) => !rejectedInterventionIds.has(candidate.id))
    .sort((left, right) => {
      const leftAttempted = attemptedInterventionIds.has(left.id) ? 1 : 0;
      const rightAttempted = attemptedInterventionIds.has(right.id) ? 1 : 0;
      if (leftAttempted !== rightAttempted) return leftAttempted - rightAttempted;
      return left.id.localeCompare(right.id);
    });

  const maySelectIntervention = blockedReasons.length === 0;
  const selectedIntervention = maySelectIntervention ? eligibleInterventions[0] ?? null : null;
  if (maySelectIntervention && selectedIntervention === null) {
    blockedReasons.push("no_safe_intervention_candidate_for_primary");
  }

  const interventionAllowed = selectedIntervention !== null && blockedReasons.length === 0;
  const referencedEvidenceIds = unique(
    rankedHypotheses.flatMap((hypothesis) => [
      ...hypothesis.supportEvidenceIds,
      ...hypothesis.counterEvidenceIds,
      ...hypothesis.stateFactorEvidenceIds
    ])
  );
  const excludedEvidence = extraction.evidence
    .filter((evidence) => !referencedEvidenceIds.includes(evidence.id))
    .map((evidence) => ({
      evidenceId: evidence.id,
      reason: "候補仮説の支持・反証・状態要因として参照されていない。"
    }));

  return {
    resolutionVersion: "resolver-v1",
    episodeId: extraction.episodeId,
    rankedHypotheses,
    evidenceBasedConfidenceStage: primary.confidence.level,
    selectedIntervention,
    interventionAllowed,
    humanReviewRequired,
    additionalQuestion: extraction.additionalQuestions[0] ?? null,
    auditReasons: {
      usedEvidenceIds: referencedEvidenceIds,
      excludedEvidence,
      rankIncreaseReasons: scored.map((item) => ({
        hypothesisId: item.candidate.id,
        reasons: item.increases
      })),
      rankDecreaseReasons: scored.map((item) => ({
        hypothesisId: item.candidate.id,
        reasons: item.decreases
      })),
      selectedInterventionReason: selectedIntervention
        ? `正式主仮説${primary.id}に対応し、安全条件を満たす候補から、未試行を優先して選択した。`
        : null,
      blockedReasons,
      resolutionRuleVersion: "resolver-v1"
    }
  };
}

export function materializeHypothesisStates(
  resolved: ResolvedAnalysis,
  at: string
): HypothesisState[] {
  return resolved.rankedHypotheses.map((hypothesis) => ({
    id: hypothesis.id,
    code: hypothesis.code,
    label: hypothesis.label,
    rank: hypothesis.rank,
    priorityScore: hypothesis.priorityScore,
    status: "active",
    supportEvidenceIds: [...hypothesis.supportEvidenceIds],
    counterEvidenceIds: [...hypothesis.counterEvidenceIds],
    unknowns: [...hypothesis.unknowns],
    stateFactors: [...hypothesis.stateFactorEvidenceIds],
    confidence: hypothesis.confidence,
    history: [
      {
        id: `resolved:${resolved.episodeId}:${hypothesis.id}:${at}`,
        at,
        type: "created",
        note: `resolutionRuleVersion=${resolved.auditReasons.resolutionRuleVersion}`
      }
    ]
  }));
}

export const resolvedConfidenceStages = confidenceLevels;
