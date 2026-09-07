import type { Scores } from "@/src/lib/cognitive";

export const THEORY_SPEC_VERSION = "SELF-THEORY-v0.1";
export const APP_MODEL_VERSION = "cognitive-manual-v0.4-decision-loop";

export const canonicalEquations = {
  E1: "y^(d) = psi_d(T_theta(phi_d(x^(d))))",
  E2: "Delta_t = d(O_t, O_hat_t(M_t))",
  E3: "H_t* = argmin_H [ L(O_t | H) + lambda Complexity(H) ]",
  E4: "a_t* = argmax_a E[V(a | H_t*, M_t)]",
  E5: "M_(t+1) = Update(M_t, O_t, a_t, F_t)",
  E6: "R_t = Generalize(M_(t+1))"
} as const;

export type TheoryAuthority = "canonical" | "derived" | "legacy";
export type ConfidenceBand = "low" | "provisional" | "moderate" | "conditional-high";
export type HypothesisStatus = "support" | "ambiguous" | "counterexample" | "untested";
export type ValidationStatus = "pending" | "match" | "partial" | "miss" | "not-testable";
export type EvidenceSource =
  | "assessment"
  | "self-report"
  | "natural-episode"
  | "external-observation"
  | "import";

export type EvidenceDomain =
  | "general"
  | "study"
  | "work"
  | "relationship"
  | "health-routine"
  | "sport"
  | "technology"
  | "decision"
  | "other";

export type EvidenceItem = {
  id: string;
  source: EvidenceSource;
  domain: EvidenceDomain;
  observedAt: string;
  summary: string;
  context?: string;
  action?: string;
  outcome?: string;
  feedback?: string;
  confidence: ConfidenceBand;
  tags: string[];
};

export type ModelHypothesis = {
  id: string;
  title: string;
  statement: string;
  authority: TheoryAuthority;
  status: HypothesisStatus;
  confidence: ConfidenceBand;
  supportingEvidenceIds: string[];
  counterEvidenceIds: string[];
  conditions: string[];
  boundaryConditions: string[];
  modelVersion: string;
};

export type DecisionCase = {
  id: string;
  domain: EvidenceDomain;
  createdAt: string;
  predictionFrozenAt?: string;
  evidenceIds: string[];
  goal?: string;
  constraints?: string[];
  prediction?: string;
  falsificationConditions?: string[];
  uncertainty?: ConfidenceBand;
  utilityNote?: string;
  decision?: string;
  outcome?: string;
  outcomeObservedAt?: string;
  feedback?: string;
  validatedAt?: string;
  validation: ValidationStatus;
};

export type TheorySyncState = {
  schemaVersion: 1;
  theorySpecVersion: string;
  appModelVersion: string;
  evidence: EvidenceItem[];
  hypotheses: ModelHypothesis[];
  decisionCases: DecisionCase[];
};

export const emptyTheorySyncState: TheorySyncState = {
  schemaVersion: 1,
  theorySpecVersion: THEORY_SPEC_VERSION,
  appModelVersion: APP_MODEL_VERSION,
  evidence: [],
  hypotheses: [],
  decisionCases: []
};

function hasAnyAssessmentValue(scores: Scores): boolean {
  return [scores.fiq, scores.viq, scores.piq, scores.vc, scores.po, scores.wm, scores.ps].some(
    (value) => value.trim() !== ""
  );
}

export function assessmentToEvidence(scores: Scores): EvidenceItem | null {
  if (!hasAnyAssessmentValue(scores)) return null;

  const values = [
    ["FIQ", scores.fiq],
    ["VIQ", scores.viq],
    ["PIQ", scores.piq],
    ["VC", scores.vc],
    ["PO", scores.po],
    ["WM", scores.wm],
    ["PS", scores.ps]
  ]
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => `${key} ${value}`)
    .join(" / ");

  return {
    id: `assessment-${scores.testDate || "undated"}`,
    source: "assessment",
    domain: "general",
    observedAt: scores.testDate || "",
    summary: `${scores.testName || "心理検査"}: ${values}`,
    context: scores.memo || undefined,
    confidence: "moderate",
    tags: ["assessment", "structured-input"]
  };
}

export function upsertAssessmentEvidence(
  state: TheorySyncState,
  scores: Scores
): TheorySyncState {
  const assessment = assessmentToEvidence(scores);
  const withoutAssessment = state.evidence.filter((item) => item.source !== "assessment");

  return {
    ...state,
    theorySpecVersion: THEORY_SPEC_VERSION,
    appModelVersion: APP_MODEL_VERSION,
    evidence: assessment ? [assessment, ...withoutAssessment] : withoutAssessment
  };
}

export function makeLegacyHypothesis(input: {
  title: string;
  statement: string;
  evidenceIds: string[];
  conditions?: string[];
}): ModelHypothesis {
  return {
    id: "legacy-rule-based-pattern",
    title: input.title,
    statement: input.statement,
    authority: "legacy",
    status: "untested",
    confidence: "provisional",
    supportingEvidenceIds: input.evidenceIds,
    counterEvidenceIds: [],
    conditions: input.conditions || [],
    boundaryConditions: [
      "心理検査だけで人格・行動を固定しない",
      "一時的な状態と比較的安定した特性を分離する",
      "反証・予測誤差・別領域のEvidenceで更新する"
    ],
    modelVersion: APP_MODEL_VERSION
  };
}

export function theorySyncCoverage(state: TheorySyncState) {
  const assessmentCount = state.evidence.filter((item) => item.source === "assessment").length;
  const naturalEpisodeCount = state.evidence.filter((item) => item.source === "natural-episode").length;
  const completedCases = state.decisionCases.filter((item) => item.validation !== "pending").length;

  return {
    totalEvidence: state.evidence.length,
    assessmentCount,
    naturalEpisodeCount,
    hypotheses: state.hypotheses.length,
    decisionCases: state.decisionCases.length,
    completedCases,
    hasFeedbackLoop: completedCases > 0,
    phase:
      naturalEpisodeCount === 0
        ? "Evidence collection"
        : state.decisionCases.length === 0
          ? "Model formation"
          : completedCases === 0
            ? "Prospective observation"
            : "Feedback calibration"
  };
}
