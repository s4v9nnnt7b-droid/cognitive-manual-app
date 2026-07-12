import { z } from "zod";

import {
  confidenceLevels,
  evidenceKinds,
  evidenceReliabilityLevels,
  evidenceSources,
  hypothesisCodes,
  interventionFailureReasons,
  interventionOutcomes
} from "./types";

export const episodeContextSchema = z
  .object({
    contextKey: z.string().min(1),
    taskType: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    socialSetting: z.enum(["alone", "with_others", "unknown"]).optional(),
    sleepQuality: z.enum(["poor", "mixed", "good", "unknown"]).optional(),
    fatigue: z.enum(["low", "medium", "high", "unknown"]).optional(),
    anxiety: z.enum(["low", "medium", "high", "unknown"]).optional(),
    medicationState: z.enum(["usual", "changed", "not_taken", "unknown"]).optional()
  })
  .strict();

export const episodeEvidenceSchema = z
  .object({
    id: z.string().min(1),
    episodeId: z.string().min(1),
    source: z.enum(evidenceSources),
    kind: z.enum(evidenceKinds),
    statement: z.string().min(1),
    occurredAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    context: episodeContextSchema,
    userConfirmed: z.boolean().nullable(),
    reliability: z.enum(evidenceReliabilityLevels),
    stale: z.boolean().optional()
  })
  .strict();

export const interventionTrialSchema = z
  .object({
    id: z.string().min(1),
    hypothesisId: z.string().min(1),
    interventionId: z.string().min(1),
    contextKey: z.string().min(1),
    taskType: z.string().min(1),
    attempted: z.boolean(),
    started: z.boolean(),
    startDelayMinutes: z.number().min(0).nullable(),
    sustainedFiveMinutes: z.boolean().nullable(),
    subjectiveEase: z.number().int().min(1).max(5).nullable(),
    burden: z.number().int().min(1).max(5).nullable(),
    wouldUseAgain: z.boolean().nullable(),
    outcome: z.enum(interventionOutcomes),
    failureReason: z.enum(interventionFailureReasons),
    recordedAt: z.string().datetime()
  })
  .strict()
  .superRefine((trial, context) => {
    if (!trial.attempted && trial.outcome !== "not_attempted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcome"],
        message: "An unattempted intervention must use the not_attempted outcome."
      });
    }

    if (!trial.attempted && trial.failureReason !== "not_attempted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failureReason"],
        message: "An unattempted intervention must use the not_attempted failure reason."
      });
    }

    if (trial.outcome === "helped" && !trial.started) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["started"],
        message: "A helped intervention must have resulted in starting."
      });
    }
  });

const analysisEvidenceKinds = [
  "reported_fact",
  "self_explanation",
  "state_factor",
  "counterevidence",
  "user_correction"
] as const;

const analysisEvidenceSources = [
  "current_user_text",
  "existing_record",
  "behavior_log",
  "formal_test",
  "observer_feedback"
] as const;

const verificationStatuses = ["user_reported", "observed", "verified", "unverified"] as const;

const analysisEvidenceSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(analysisEvidenceKinds),
    statement: z.string().min(1),
    source: z.enum(analysisEvidenceSources),
    verification: z.enum(verificationStatuses)
  })
  .strict();

const analysisHypothesisSchema = z
  .object({
    id: z.string().min(1),
    rank: z.number().int().min(1).max(5),
    code: z.enum(hypothesisCodes),
    label: z.string().min(1),
    supportEvidenceIds: z.array(z.string().min(1)),
    counterEvidenceIds: z.array(z.string().min(1)),
    stateFactorEvidenceIds: z.array(z.string().min(1)),
    unknowns: z.array(z.string().min(1)),
    confidence: z.enum(confidenceLevels),
    rationale: z.string().min(1)
  })
  .strict();

const contradictionSchema = z
  .object({
    id: z.string().min(1),
    evidenceIds: z.array(z.string().min(1)).min(2),
    description: z.string().min(1)
  })
  .strict();

const recommendedInterventionSchema = z
  .object({
    hypothesisId: z.string().min(1),
    interventionId: z.string().min(1),
    instruction: z.string().min(1),
    observableResult: z.string().min(1)
  })
  .strict();

const unknownHypothesisCodes = new Set(["insufficient_information", "unknown", "outside_taxonomy"]);

export const aiAnalysisSchema = z
  .object({
    analysisVersion: z.literal("self-manual-v2"),
    episodeId: z.string().min(1),
    evidence: z.array(analysisEvidenceSchema).min(1),
    factEvidenceIds: z.array(z.string().min(1)),
    selfExplanationEvidenceIds: z.array(z.string().min(1)),
    hypotheses: z.array(analysisHypothesisSchema).min(1).max(5),
    unresolvedContradictions: z.array(contradictionSchema),
    additionalQuestions: z.array(z.string().min(1)).max(1),
    recommendedIntervention: recommendedInterventionSchema.nullable(),
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
    const hypothesisById = new Map(analysis.hypotheses.map((hypothesis) => [hypothesis.id, hypothesis]));
    const ranks = analysis.hypotheses.map((hypothesis) => hypothesis.rank);

    if (evidenceById.size !== analysis.evidence.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "Evidence IDs must be unique."
      });
    }

    if (hypothesisById.size !== analysis.hypotheses.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hypotheses"],
        message: "Hypothesis IDs must be unique."
      });
    }

    if (new Set(ranks).size !== ranks.length || !ranks.includes(1)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hypotheses"],
        message: "Hypothesis ranks must be unique and include rank 1."
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

    validateEvidenceReferences(analysis.factEvidenceIds, ["factEvidenceIds"]);
    validateEvidenceReferences(analysis.selfExplanationEvidenceIds, ["selfExplanationEvidenceIds"]);

    for (const id of analysis.factEvidenceIds) {
      if (evidenceById.get(id)?.kind !== "reported_fact") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factEvidenceIds"],
          message: "factEvidenceIds may reference only reported_fact evidence."
        });
      }
    }

    for (const id of analysis.selfExplanationEvidenceIds) {
      if (evidenceById.get(id)?.kind !== "self_explanation") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selfExplanationEvidenceIds"],
          message: "selfExplanationEvidenceIds may reference only self_explanation evidence."
        });
      }
    }

    analysis.hypotheses.forEach((hypothesis, index) => {
      validateEvidenceReferences(hypothesis.supportEvidenceIds, ["hypotheses", index, "supportEvidenceIds"]);
      validateEvidenceReferences(hypothesis.counterEvidenceIds, ["hypotheses", index, "counterEvidenceIds"]);
      validateEvidenceReferences(hypothesis.stateFactorEvidenceIds, [
        "hypotheses",
        index,
        "stateFactorEvidenceIds"
      ]);

      for (const id of hypothesis.stateFactorEvidenceIds) {
        if (evidenceById.get(id)?.kind !== "state_factor") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["hypotheses", index, "stateFactorEvidenceIds"],
            message: "stateFactorEvidenceIds may reference only state_factor evidence."
          });
        }
      }
    });

    analysis.unresolvedContradictions.forEach((contradiction, index) => {
      validateEvidenceReferences(contradiction.evidenceIds, [
        "unresolvedContradictions",
        index,
        "evidenceIds"
      ]);
    });

    if (analysis.recommendedIntervention) {
      const target = hypothesisById.get(analysis.recommendedIntervention.hypothesisId);
      if (!target) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recommendedIntervention", "hypothesisId"],
          message: "The recommended intervention must target a hypothesis present in the analysis."
        });
      } else if (unknownHypothesisCodes.has(target.code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recommendedIntervention"],
          message: "Unknown, insufficient-information, and outside-taxonomy hypotheses cannot receive an intervention."
        });
      }
    }

    const primaryHypothesis = analysis.hypotheses.find((hypothesis) => hypothesis.rank === 1);
    if (primaryHypothesis && unknownHypothesisCodes.has(primaryHypothesis.code)) {
      if (analysis.additionalQuestions.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["additionalQuestions"],
          message: "A primary unknown path must include exactly one next confirmation question."
        });
      }
      if (analysis.recommendedIntervention !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recommendedIntervention"],
          message: "A primary unknown path cannot recommend an intervention."
        });
      }
    }

    const usesOutsideTaxonomy = analysis.hypotheses.some(
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

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
