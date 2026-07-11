import type {
  ConfidenceAssessment,
  ConfidenceFactor,
  ConfidenceLevel,
  EpisodeEvidence,
  HypothesisState,
  InterventionTrial,
  ManualEntry,
  UserCorrection
} from "./types";

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const sumWeights = (factors: ConfidenceFactor[]): number =>
  factors.reduce((total, factor) => total + factor.weight, 0);

const groupCount = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
};

export function assessConfidence(
  hypothesis: HypothesisState,
  evidence: EpisodeEvidence[],
  trials: InterventionTrial[]
): ConfidenceAssessment {
  const positiveFactors: ConfidenceFactor[] = [];
  const negativeFactors: ConfidenceFactor[] = [];
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const supportEvidence = hypothesis.supportEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is EpisodeEvidence => Boolean(item));
  const counterEvidence = hypothesis.counterEvidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is EpisodeEvidence => Boolean(item));
  const relevantTrials = trials.filter((trial) => trial.hypothesisId === hypothesis.id);
  const helpedTrials = relevantTrials.filter((trial) => trial.outcome === "helped");
  const helpedContexts = groupCount(helpedTrials.map((trial) => trial.contextKey));
  const largestSameContextReplication = Math.max(0, ...Array.from(helpedContexts.values()));
  const distinctHelpedContexts = helpedContexts.size;

  const confirmedEvidence = supportEvidence.filter((item) => item.userConfirmed === true);
  if (confirmedEvidence.length > 0) {
    positiveFactors.push({
      code: "user_confirmed",
      direction: "up",
      weight: 2,
      reason: "本人が支持証拠を確認している。",
      evidenceIds: confirmedEvidence.map((item) => item.id)
    });
  }

  const independentSources = unique(
    supportEvidence
      .filter((item) => item.source !== "ai_inference")
      .map((item) => item.source)
  );
  if (independentSources.length >= 2) {
    positiveFactors.push({
      code: "independent_sources_agree",
      direction: "up",
      weight: independentSources.length >= 3 ? 3 : 2,
      reason: `${independentSources.length}種類の独立した証拠源が支持している。`,
      evidenceIds: supportEvidence.map((item) => item.id)
    });
  }

  if (largestSameContextReplication >= 2) {
    positiveFactors.push({
      code: "same_context_replication",
      direction: "up",
      weight: largestSameContextReplication >= 5 ? 3 : 2,
      reason: `同じ条件で有効性が${largestSameContextReplication}回再現している。`,
      evidenceIds: helpedTrials.map((trial) => trial.id)
    });
  }

  if (distinctHelpedContexts >= 2) {
    positiveFactors.push({
      code: "cross_context_replication",
      direction: "up",
      weight: 3,
      reason: `${distinctHelpedContexts}種類の場面で有効性が再現している。`,
      evidenceIds: helpedTrials.map((trial) => trial.id)
    });
  }

  if (helpedTrials.length >= 2) {
    positiveFactors.push({
      code: "positive_intervention_result",
      direction: "up",
      weight: 2,
      reason: `介入後に着手改善が${helpedTrials.length}回記録されている。`,
      evidenceIds: helpedTrials.map((trial) => trial.id)
    });
  }

  const strongCounterevidence = counterEvidence.filter((item) => item.reliability === "high");
  if (strongCounterevidence.length > 0) {
    negativeFactors.push({
      code: "strong_counterevidence",
      direction: "down",
      weight: 3,
      reason: "信頼性の高い反証がある。",
      evidenceIds: strongCounterevidence.map((item) => item.id)
    });
  }

  const rejectedEvidence = counterEvidence.filter(
    (item) => item.kind === "correction" && item.userConfirmed === true
  );
  if (rejectedEvidence.length > 0 || hypothesis.history.some((event) => event.type === "user_corrected")) {
    negativeFactors.push({
      code: "user_rejected",
      direction: "down",
      weight: 3,
      reason: "本人が現在の仮説を訂正している。",
      evidenceIds: rejectedEvidence.map((item) => item.id)
    });
  }

  if (
    hypothesis.code === "insufficient_information" ||
    hypothesis.code === "unknown" ||
    hypothesis.code === "outside_taxonomy" ||
    supportEvidence.length === 0
  ) {
    negativeFactors.push({
      code: "insufficient_information",
      direction: "down",
      weight: 2,
      reason: "現時点では支持情報が不足している。",
      evidenceIds: []
    });
  }

  if (hypothesis.stateFactors.length > 0 && !supportEvidence.some((item) => item.kind === "state_factor")) {
    negativeFactors.push({
      code: "state_not_separated",
      direction: "down",
      weight: 1,
      reason: "一時状態の影響がまだ分離されていない。",
      evidenceIds: []
    });
  }

  const staleEvidence = supportEvidence.filter((item) => item.stale === true);
  if (staleEvidence.length > 0) {
    negativeFactors.push({
      code: "stale_evidence",
      direction: "down",
      weight: 1,
      reason: "支持証拠の一部が古い。",
      evidenceIds: staleEvidence.map((item) => item.id)
    });
  }

  const positiveScore = sumWeights(positiveFactors);
  const negativeScore = sumWeights(negativeFactors);
  const netScore = positiveScore - negativeScore;
  const hasSevereNegative = negativeFactors.some((factor) => factor.weight === 3);

  let level: ConfidenceLevel = "low";
  if (
    largestSameContextReplication >= 5 &&
    distinctHelpedContexts >= 2 &&
    !hasSevereNegative &&
    netScore >= 6
  ) {
    level = "conditionally_high";
  } else if (!hasSevereNegative && netScore >= 4) {
    level = "medium";
  } else if (netScore >= 1) {
    level = "provisional";
  }

  return { level, positiveFactors, negativeFactors };
}

export function rerankHypotheses(hypotheses: HypothesisState[], at: string): HypothesisState[] {
  const previousRanks = new Map(hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.rank]));
  const sorted = [...hypotheses].sort((left, right) => {
    if (right.priorityScore !== left.priorityScore) {
      return right.priorityScore - left.priorityScore;
    }
    return left.id.localeCompare(right.id);
  });

  return sorted.map((hypothesis, index) => {
    const rank = index + 1;
    if (previousRanks.get(hypothesis.id) === rank) {
      return { ...hypothesis, rank };
    }

    return {
      ...hypothesis,
      rank,
      history: [
        ...hypothesis.history,
        {
          id: `rank:${hypothesis.id}:${at}:${rank}`,
          at,
          type: "rank_changed",
          note: `仮説順位が${previousRanks.get(hypothesis.id) ?? "未設定"}位から${rank}位へ変化した。`
        }
      ]
    };
  });
}

export function applyUserCorrection(
  hypotheses: HypothesisState[],
  correction: UserCorrection,
  evidence: EpisodeEvidence[],
  trials: InterventionTrial[]
): HypothesisState[] {
  const scoreDelta = {
    close: 2,
    partly_wrong: -2,
    wrong: -5,
    other_reason: -3
  }[correction.response];

  const updated = hypotheses.map((hypothesis) => {
    if (hypothesis.id !== correction.hypothesisId) {
      return hypothesis;
    }

    const isSupport = correction.response === "close";
    const next: HypothesisState = {
      ...hypothesis,
      priorityScore: hypothesis.priorityScore + scoreDelta,
      status: isSupport ? "active" : "demoted",
      supportEvidenceIds: isSupport
        ? unique([...hypothesis.supportEvidenceIds, correction.evidenceId])
        : hypothesis.supportEvidenceIds,
      counterEvidenceIds: isSupport
        ? hypothesis.counterEvidenceIds
        : unique([...hypothesis.counterEvidenceIds, correction.evidenceId]),
      history: [
        ...hypothesis.history,
        {
          id: `correction:${correction.id}`,
          at: correction.correctedAt,
          type: isSupport ? "user_confirmed" : "user_corrected",
          note: correction.reason
        }
      ]
    };

    return {
      ...next,
      confidence: assessConfidence(next, evidence, trials)
    };
  });

  return rerankHypotheses(updated, correction.correctedAt);
}

export function applyInterventionTrial(
  hypotheses: HypothesisState[],
  trial: InterventionTrial,
  evidence: EpisodeEvidence[],
  allTrials: InterventionTrial[]
): HypothesisState[] {
  const scoreDelta = (() => {
    if (trial.outcome === "helped") return 2;
    if (trial.outcome === "mixed") return 1;
    if (trial.outcome === "not_attempted") return 0;
    if (trial.failureReason === "state_factor") return 0;
    if (trial.failureReason === "intervention_mismatch") return -1;
    if (trial.failureReason === "hypothesis_mismatch") return -3;
    return -1;
  })();

  const updated = hypotheses.map((hypothesis) => {
    if (hypothesis.id !== trial.hypothesisId) {
      return {
        ...hypothesis,
        confidence: assessConfidence(hypothesis, evidence, allTrials)
      };
    }

    const historyType =
      trial.outcome === "helped"
        ? "trial_helped"
        : trial.outcome === "not_attempted"
          ? "trial_not_attempted"
          : "trial_not_helped";

    const next: HypothesisState = {
      ...hypothesis,
      priorityScore: hypothesis.priorityScore + scoreDelta,
      status: scoreDelta <= -3 ? "demoted" : hypothesis.status,
      history: [
        ...hypothesis.history,
        {
          id: `trial:${trial.id}`,
          at: trial.recordedAt,
          type: historyType,
          note: `介入結果=${trial.outcome}、不発理由=${trial.failureReason}`
        }
      ]
    };

    return {
      ...next,
      confidence: assessConfidence(next, evidence, allTrials)
    };
  });

  return rerankHypotheses(updated, trial.recordedAt);
}

export type ManualPromotionDecision = {
  eligible: boolean;
  status: "candidate" | "provisional" | "validated";
  confidence: ConfidenceLevel;
  reason: string;
  supportingTrialIds: string[];
};

export function evaluateManualPromotion(trials: InterventionTrial[]): ManualPromotionDecision {
  const attempted = trials.filter((trial) => trial.attempted);
  const helped = attempted.filter((trial) => trial.outcome === "helped");
  const distinctContexts = new Set(helped.map((trial) => trial.contextKey)).size;
  const hasHypothesisMismatch = attempted.some(
    (trial) => trial.failureReason === "hypothesis_mismatch"
  );
  const helpedRatio = attempted.length === 0 ? 0 : helped.length / attempted.length;

  if (
    attempted.length >= 5 &&
    helped.length >= 4 &&
    helpedRatio >= 0.7 &&
    distinctContexts >= 2 &&
    !hasHypothesisMismatch
  ) {
    return {
      eligible: true,
      status: "validated",
      confidence: "conditionally_high",
      reason: "5回以上の試行と複数場面で有効性が再現した。",
      supportingTrialIds: helped.map((trial) => trial.id)
    };
  }

  if (attempted.length >= 3 && helped.length >= 2 && helpedRatio >= 0.5) {
    return {
      eligible: false,
      status: "provisional",
      confidence: "provisional",
      reason: "暫定的な改善はあるが、取説へ昇格する再現条件を満たしていない。",
      supportingTrialIds: helped.map((trial) => trial.id)
    };
  }

  return {
    eligible: false,
    status: "candidate",
    confidence: "low",
    reason: "有効性を判断する試行数または再現性が不足している。",
    supportingTrialIds: helped.map((trial) => trial.id)
  };
}

export function createManualEntryIfEligible(input: {
  id: string;
  interventionId: string;
  hypothesis: HypothesisState;
  scope: string;
  effectiveConditions: string[];
  ineffectiveConditions: string[];
  trials: InterventionTrial[];
  at: string;
}): ManualEntry | null {
  const decision = evaluateManualPromotion(input.trials);
  if (!decision.eligible) {
    return null;
  }

  return {
    id: input.id,
    interventionId: input.interventionId,
    hypothesisCode: input.hypothesis.code,
    scope: input.scope,
    effectiveConditions: unique(input.effectiveConditions),
    ineffectiveConditions: unique(input.ineffectiveConditions),
    confidence: decision.confidence,
    status: decision.status,
    supportingTrialIds: decision.supportingTrialIds,
    createdAt: input.at,
    updatedAt: input.at
  };
}
