export const evidenceSources = [
  "self_report",
  "scenario_choice",
  "behavior_log",
  "formal_test",
  "intervention_trial",
  "user_correction",
  "observer_feedback",
  "ai_inference"
] as const;

export type EvidenceSource = (typeof evidenceSources)[number];

export const evidenceKinds = [
  "observed_fact",
  "self_explanation",
  "state_factor",
  "support",
  "counterevidence",
  "correction"
] as const;

export type EvidenceKind = (typeof evidenceKinds)[number];

export const evidenceReliabilityLevels = ["low", "medium", "high"] as const;
export type EvidenceReliability = (typeof evidenceReliabilityLevels)[number];

export type EpisodeContext = {
  contextKey: string;
  taskType?: string;
  location?: string;
  socialSetting?: "alone" | "with_others" | "unknown";
  sleepQuality?: "poor" | "mixed" | "good" | "unknown";
  fatigue?: "low" | "medium" | "high" | "unknown";
  anxiety?: "low" | "medium" | "high" | "unknown";
  medicationState?: "usual" | "changed" | "not_taken" | "unknown";
};

export type EpisodeEvidence = {
  id: string;
  episodeId: string;
  source: EvidenceSource;
  kind: EvidenceKind;
  statement: string;
  occurredAt: string;
  recordedAt: string;
  context: EpisodeContext;
  userConfirmed: boolean | null;
  reliability: EvidenceReliability;
  stale?: boolean;
};

export const hypothesisCodes = [
  "unclear_endpoint",
  "unclear_first_action",
  "choice_overload",
  "preparation_load",
  "anxiety_or_failure_avoidance",
  "state_load",
  "low_reward_or_priority",
  "missing_social_trigger",
  "compound",
  "insufficient_information",
  "unknown",
  "outside_taxonomy"
] as const;

export type HypothesisCode = (typeof hypothesisCodes)[number];

export const confidenceLevels = ["low", "provisional", "medium", "conditionally_high"] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const confidenceFactorCodes = [
  "user_confirmed",
  "independent_sources_agree",
  "same_context_replication",
  "cross_context_replication",
  "positive_intervention_result",
  "strong_counterevidence",
  "user_rejected",
  "insufficient_information",
  "state_not_separated",
  "stale_evidence"
] as const;

export type ConfidenceFactorCode = (typeof confidenceFactorCodes)[number];

export type ConfidenceFactor = {
  code: ConfidenceFactorCode;
  direction: "up" | "down";
  weight: 1 | 2 | 3;
  reason: string;
  evidenceIds: string[];
};

export type ConfidenceAssessment = {
  level: ConfidenceLevel;
  positiveFactors: ConfidenceFactor[];
  negativeFactors: ConfidenceFactor[];
};

export type HypothesisHistoryEvent = {
  id: string;
  at: string;
  type:
    | "created"
    | "user_confirmed"
    | "user_corrected"
    | "trial_helped"
    | "trial_not_helped"
    | "trial_not_attempted"
    | "rank_changed";
  note: string;
};

export type HypothesisState = {
  id: string;
  code: HypothesisCode;
  label: string;
  rank: number;
  priorityScore: number;
  status: "active" | "demoted" | "held";
  supportEvidenceIds: string[];
  counterEvidenceIds: string[];
  unknowns: string[];
  stateFactorEvidenceIds: string[];
  confidence: ConfidenceAssessment;
  history: HypothesisHistoryEvent[];
};

export const interventionOutcomes = ["helped", "mixed", "not_helped", "not_attempted"] as const;
export type InterventionOutcome = (typeof interventionOutcomes)[number];

export const interventionFailureReasons = [
  "none",
  "not_attempted",
  "state_factor",
  "intervention_mismatch",
  "hypothesis_mismatch",
  "unknown"
] as const;

export type InterventionFailureReason = (typeof interventionFailureReasons)[number];

export type InterventionTrial = {
  id: string;
  hypothesisId: string;
  interventionId: string;
  contextKey: string;
  taskType: string;
  attempted: boolean;
  started: boolean;
  startDelayMinutes: number | null;
  sustainedFiveMinutes: boolean | null;
  subjectiveEase: 1 | 2 | 3 | 4 | 5 | null;
  burden: 1 | 2 | 3 | 4 | 5 | null;
  wouldUseAgain: boolean | null;
  outcome: InterventionOutcome;
  failureReason: InterventionFailureReason;
  recordedAt: string;
};

export type ManualEntryStatus = "candidate" | "provisional" | "validated";

export type ManualEntry = {
  id: string;
  interventionId: string;
  hypothesisCode: HypothesisCode;
  scope: string;
  effectiveConditions: string[];
  ineffectiveConditions: string[];
  confidence: ConfidenceLevel;
  status: ManualEntryStatus;
  supportingTrialIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserCorrectionResponse = "close" | "partly_wrong" | "wrong" | "other_reason";

export type UserCorrection = {
  id: string;
  hypothesisId: string;
  response: UserCorrectionResponse;
  reason: string;
  evidenceId: string;
  correctedAt: string;
};
