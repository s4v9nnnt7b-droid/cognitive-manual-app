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

const analysisHypothesisSchema = z
  .object({
    id: z.string().min(1),
    code: z.enum(hypothesisCodes),
    label: z.string().min(1),
    supportEvidenceIds: z.array(z.string().min(1)),
    counterEvidenceIds: z.array(z.string().min(1)),
    unknowns: z.array(z.string().min(1)),
    stateFactors: z.array(z.string().min(1)),
    confidence: z.enum(confidenceLevels),
    rationale: z.string().min(1)
  })
  .strict();

const recommendedInterventionSchema = z
  .object({
    hypothesisCode: z.enum(hypothesisCodes),
    interventionId: z.string().min(1),
    instruction: z.string().min(1),
    observableResult: z.string().min(1)
  })
  .strict();

export const aiAnalysisSchema = z
  .object({
    analysisVersion: z.literal("self-manual-v1"),
    episodeId: z.string().min(1),
    facts: z.array(z.string().min(1)),
    selfExplanation: z.array(z.string().min(1)),
    hypotheses: z.array(analysisHypothesisSchema).min(1).max(5),
    unresolvedContradictions: z.array(z.string().min(1)),
    additionalQuestions: z.array(z.string().min(1)).max(3),
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
    const hypothesisCodesInOutput = new Set(analysis.hypotheses.map((hypothesis) => hypothesis.code));

    if (
      analysis.recommendedIntervention &&
      !hypothesisCodesInOutput.has(analysis.recommendedIntervention.hypothesisCode)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recommendedIntervention", "hypothesisCode"],
        message: "The recommended intervention must target a hypothesis present in the analysis."
      });
    }

    const usesUnknownPath = analysis.hypotheses.some((hypothesis) =>
      ["insufficient_information", "unknown", "outside_taxonomy"].includes(hypothesis.code)
    );

    if (usesUnknownPath && analysis.additionalQuestions.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["additionalQuestions"],
        message: "Unknown or insufficient-information outputs must include a next confirmation question."
      });
    }
  });

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
