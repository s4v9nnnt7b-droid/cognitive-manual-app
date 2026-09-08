import type {
  AlgorithmKernelSpec,
  AlgorithmReadiness,
  EvidenceDomain,
  TheorySyncState
} from "@/src/lib/theory";

export const ALGORITHM_KERNEL_VERSION = "root-to-algorithm-kernel-v0.1";

export type GenerateAlgorithmKernelInput = {
  state: TheorySyncState;
  domain: EvidenceDomain;
  goal: string;
  constraints?: string[];
};

export type DomainReadinessSummary = {
  domain: EvidenceDomain;
  evidenceIds: string[];
  evidenceCount: number;
  naturalEpisodeCount: number;
  outcomeEvidenceCount: number;
  completedDecisionCount: number;
  readiness: AlgorithmReadiness;
  reasons: string[];
};

export function inspectDomainReadiness(
  state: TheorySyncState,
  domain: EvidenceDomain,
  goal: string
): DomainReadinessSummary {
  const relevantEvidence = state.evidence.filter(
    (item) => item.domain === domain || item.domain === "general"
  );
  const naturalEpisodes = relevantEvidence.filter((item) => item.source === "natural-episode");
  const outcomeEvidence = relevantEvidence.filter((item) => Boolean(item.outcome || item.feedback));
  const completedDecisions = state.decisionCases.filter(
    (item) => item.domain === domain && item.validation !== "pending"
  );

  const reasons: string[] = [];
  let readiness: AlgorithmReadiness = "pilot-ready";

  if (!goal.trim()) {
    readiness = "observe-more";
    reasons.push("Goalが未定義です。Objectiveなしに最適化しません。");
  }

  if (relevantEvidence.length === 0) {
    readiness = "observe-more";
    reasons.push("このDomainに利用できるEvidenceがありません。");
  } else if (readiness !== "observe-more" && (
    naturalEpisodes.length < 2 ||
    (outcomeEvidence.length === 0 && completedDecisions.length === 0)
  )) {
    readiness = "qualitative";
    reasons.push("定量式より先に、条件付きの質的モデルとして扱う段階です。");
  }

  if (readiness === "pilot-ready") {
    reasons.push("低リスクPilot用のDecision Architectureを組めるEvidenceがあります。");
  }

  return {
    domain,
    evidenceIds: relevantEvidence.map((item) => item.id),
    evidenceCount: relevantEvidence.length,
    naturalEpisodeCount: naturalEpisodes.length,
    outcomeEvidenceCount: outcomeEvidence.length,
    completedDecisionCount: completedDecisions.length,
    readiness,
    reasons
  };
}

export function generateAlgorithmKernelSpec(input: GenerateAlgorithmKernelInput): AlgorithmKernelSpec {
  const goal = input.goal.trim();
  const constraints = (input.constraints || []).map((item) => item.trim()).filter(Boolean);
  const readiness = inspectDomainReadiness(input.state, input.domain, goal);
  const now = new Date().toISOString();

  const nextAction = readiness.readiness === "observe-more"
    ? "OBSERVE_MORE"
    : readiness.readiness === "qualitative"
      ? "QUALITATIVE_MODEL"
      : "LOW_RISK_PILOT";

  return {
    id: `kernel-${Date.now()}`,
    domain: input.domain,
    createdAt: now,
    authority: "derived",
    generatorVersion: ALGORITHM_KERNEL_VERSION,
    theorySpecVersion: input.state.theorySpecVersion,
    appModelVersion: input.state.appModelVersion,
    goal,
    constraints,
    evidenceIds: readiness.evidenceIds,
    evidenceCount: readiness.evidenceCount,
    naturalEpisodeCount: readiness.naturalEpisodeCount,
    outcomeEvidenceCount: readiness.outcomeEvidenceCount,
    completedDecisionCount: readiness.completedDecisionCount,
    readiness: readiness.readiness,
    readinessReasons: readiness.reasons,
    representationContract: [
      "Evidence provenanceを保持する",
      "Observation / Context / Action / Outcome / Feedbackを分離する",
      "Domain固有情報を共通表現へ変換し、BiasとUncertaintyを未知のまま残せる"
    ],
    predictionContract: [
      "PredictionはPreferenceと分離する",
      "Evidenceから支持できないOutcome probabilityを捏造しない",
      "Outcome前にPredictionをFreezeできる形にする"
    ],
    utilityContract: [
      "Goal / Values / Hard Constraintsは人間側が与える",
      "Risk / Cost / Load / Irreversibility / Option Valueを必要に応じて分離する",
      "『起こりそう』と『望ましい』を同一視しない"
    ],
    decisionContract: [
      "Prediction + Utility + ConstraintsからDecision候補を作る",
      "自動実行権限は持たない",
      "Evidence不足時はNO EQUATION YET / OBSERVE MOREを正規出力にする"
    ],
    validationContract: [
      "Prediction Freeze → Outcome → Feedback → Validation",
      "MATCH / PARTIAL / MISS / NOT TESTABLEを保存する",
      "MISSやCounterexampleを削除せず、Pilot中にGeneratorを後付け修正しない"
    ],
    nextAction,
    guardrails: [
      "Canonical Root Theory / S01 locked authorityを変更しない",
      "Applicationの便利さをTheoryのTruthの証明に使わない",
      "High-stakes / irreversible decisionへ自動昇格しない",
      "Kernel自体を新しいBottleneckにしない"
    ]
  };
}
