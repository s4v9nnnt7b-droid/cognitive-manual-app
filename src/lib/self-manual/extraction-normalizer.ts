import { aiExtractionSchema } from "./analysis-contract";
import type { AIExtractionResult } from "./analysis-contract";
import type { HypothesisCode } from "./types";

export const extractionNormalizationRuleCodes = [
  "explicit_known_completion_excludes_unclear_endpoint",
  "explicit_choice_overload_subsumes_unclear_first_action",
  "explicit_choice_overload_restores_missing_candidate",
  "explicit_preparation_load_restores_missing_candidate",
  "explicit_multi_barrier_restores_compound",
  "orphaned_compound_removed_after_fact_conflict"
] as const;

export type ExtractionNormalizationRuleCode =
  (typeof extractionNormalizationRuleCodes)[number];

export type ExtractionNormalizationAudit = {
  appliedRuleCodes: ExtractionNormalizationRuleCode[];
  removedHypothesisCodes: HypothesisCode[];
  removedInterventionCount: number;
};

export type NormalizedExtractionResult = {
  extraction: AIExtractionResult;
  audit: ExtractionNormalizationAudit;
};

const unknownHypothesisCodes = new Set<HypothesisCode>([
  "insufficient_information",
  "unknown",
  "outside_taxonomy"
]);

const completionConditionTerms =
  /(?:完成条件|完了条件|終了条件|終わりの条件|終える条件|定義\s*of\s*done)/iu;
const knownConditionMarkers =
  /(?:分かっている|わかっている|理解している|把握している|明確(?:だ|である|になっている)?|決まっている|知っている)/u;
const unknownConditionMarkers =
  /(?:分からない|わからない|分かっていない|わかっていない|分かってない|わかってない|不明|曖昧|不明確|決まっていない|把握していない|知らない|はっきりしない|明確でない)/u;

const choiceQuantityMarkers =
  /(?:全部|どれも|いずれも|複数|多数|たくさん|多すぎ|多く|何(?:冊|件|個|つ)も|[二三四五六七八九十0-9]+(?:冊|件|個|つ|項目|作業|候補|選択肢))/u;
const choiceComparisonMarkers =
  /(?:大事|重要|優先|選(?:ぶ|べ|び|択)|比較|順番|どれから|何から|一つに絞|候補|選択肢)/u;
const independentFirstActionMarkers =
  /(?:選(?:んだ|び終えた|択した)後|一つに絞(?:った|っても|り終えても)|候補を決め(?:た|ても)後|それとは別に|さらに|加えて).{0,50}(?:最初|第一歩|最初の操作|最初の手順).{0,40}(?:分から|わから|不明|決められ|選べ|迷)/u;
const preparationMarkers =
  /(?:机(?:の上)?を(?:片づけ|片付け|空け)|該当ページを探|ページを探す準備|準備(?:が必要|をする|する必要|に時間)|必要な(?:物|もの|資料|道具)を(?:集め|用意)|セットアップ)/u;

function splitClauses(text: string): string[] {
  return text
    .normalize("NFKC")
    .split(/[。！？!?\n]+/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function uniqueId(base: string, usedIds: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

export function hasExplicitKnownCompletionCondition(text: string): boolean {
  const clauses = splitClauses(text);
  const hasKnown = clauses.some(
    (clause) =>
      completionConditionTerms.test(clause) &&
      knownConditionMarkers.test(clause) &&
      !unknownConditionMarkers.test(clause)
  );
  const hasUnknown = clauses.some(
    (clause) =>
      completionConditionTerms.test(clause) &&
      unknownConditionMarkers.test(clause)
  );
  return hasKnown && !hasUnknown;
}

export function hasExplicitChoiceOverload(text: string): boolean {
  const normalized = text.normalize("NFKC");
  return choiceQuantityMarkers.test(normalized) && choiceComparisonMarkers.test(normalized);
}

export function hasExplicitPreparationLoad(text: string): boolean {
  return preparationMarkers.test(text.normalize("NFKC"));
}

export function hasIndependentFirstActionAmbiguity(text: string): boolean {
  return independentFirstActionMarkers.test(text.normalize("NFKC"));
}

function emptyAudit(): ExtractionNormalizationAudit {
  return {
    appliedRuleCodes: [],
    removedHypothesisCodes: [],
    removedInterventionCount: 0
  };
}

export function normalizeExtractionAgainstExplicitEpisodeFacts(
  rawExtraction: AIExtractionResult,
  episodeText: string
): NormalizedExtractionResult {
  const extraction = aiExtractionSchema.parse(rawExtraction);
  const evidence = [...extraction.evidence];
  let candidates = [...extraction.hypothesisCandidates];
  let interventions = [...extraction.interventionCandidates];

  const removedIds = new Set<string>();
  const removedCodes: HypothesisCode[] = [];
  const appliedRuleCodes: ExtractionNormalizationRuleCode[] = [];

  const hasCode = (code: HypothesisCode) =>
    candidates.some((candidate) => candidate.code === code);

  if (
    hasExplicitKnownCompletionCondition(episodeText) &&
    hasCode("unclear_endpoint") &&
    candidates.some((candidate) => candidate.code !== "unclear_endpoint")
  ) {
    for (const candidate of candidates) {
      if (candidate.code === "unclear_endpoint") removedIds.add(candidate.id);
    }
    removedCodes.push("unclear_endpoint");
    appliedRuleCodes.push("explicit_known_completion_excludes_unclear_endpoint");
  }

  if (
    hasExplicitChoiceOverload(episodeText) &&
    !hasIndependentFirstActionAmbiguity(episodeText) &&
    hasCode("choice_overload") &&
    hasCode("unclear_first_action")
  ) {
    for (const candidate of candidates) {
      if (candidate.code === "unclear_first_action") removedIds.add(candidate.id);
    }
    removedCodes.push("unclear_first_action");
    appliedRuleCodes.push("explicit_choice_overload_subsumes_unclear_first_action");
  }

  candidates = candidates.filter((candidate) => !removedIds.has(candidate.id));
  interventions = interventions.filter(
    (candidate) => !removedIds.has(candidate.hypothesisId)
  );

  const explicitChoice = hasExplicitChoiceOverload(episodeText);
  const explicitPreparation = hasExplicitPreparationLoad(episodeText);
  const hasSupportedComponent =
    candidates.some((candidate) => candidate.code === "choice_overload") ||
    candidates.some((candidate) => candidate.code === "preparation_load");

  if (
    explicitChoice &&
    explicitPreparation &&
    hasSupportedComponent &&
    candidates.length <= 3
  ) {
    const evidenceIds = new Set(evidence.map((item) => item.id));
    const candidateIds = new Set(candidates.map((item) => item.id));
    const interventionIds = new Set(interventions.map((item) => item.id));

    let choiceCandidate = candidates.find(
      (candidate) => candidate.code === "choice_overload"
    );
    let preparationCandidate = candidates.find(
      (candidate) => candidate.code === "preparation_load"
    );

    if (!choiceCandidate) {
      const evidenceId = uniqueId("app-explicit-choice-overload-evidence", evidenceIds);
      const candidateId = uniqueId("app-explicit-choice-overload", candidateIds);
      evidence.push({
        id: evidenceId,
        kind: "reported_fact",
        statement:
          "複数の教材または選択肢から一つを選ぶ必要があると本人が述べている。",
        source: "current_user_text",
        verification: "user_reported"
      });
      choiceCandidate = {
        id: candidateId,
        code: "choice_overload",
        label: "選択過多",
        supportEvidenceIds: [evidenceId],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale:
          "複数の教材または選択肢から一つを選ぶ工程が明示されている。"
      };
      candidates.push(choiceCandidate);
      appliedRuleCodes.push("explicit_choice_overload_restores_missing_candidate");
    }

    if (!preparationCandidate) {
      const evidenceId = uniqueId("app-explicit-preparation-load-evidence", evidenceIds);
      const candidateId = uniqueId("app-explicit-preparation-load", candidateIds);
      evidence.push({
        id: evidenceId,
        kind: "reported_fact",
        statement:
          "作業開始前に片づけ・探索・準備が必要だと本人が述べている。",
        source: "current_user_text",
        verification: "user_reported"
      });
      preparationCandidate = {
        id: candidateId,
        code: "preparation_load",
        label: "準備負荷",
        supportEvidenceIds: [evidenceId],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale:
          "作業開始前の片づけ・探索・準備が明示されている。"
      };
      candidates.push(preparationCandidate);
      appliedRuleCodes.push("explicit_preparation_load_restores_missing_candidate");
    }

    let compoundCandidate = candidates.find(
      (candidate) => candidate.code === "compound"
    );

    if (!compoundCandidate && choiceCandidate && preparationCandidate) {
      const compoundId = uniqueId("app-explicit-choice-preparation-compound", candidateIds);
      const supportEvidenceIds = Array.from(
        new Set([
          ...choiceCandidate.supportEvidenceIds,
          ...preparationCandidate.supportEvidenceIds
        ])
      );

      compoundCandidate = {
        id: compoundId,
        code: "compound",
        label: "選択過多と準備負荷の複合",
        supportEvidenceIds,
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale:
          "教材選択と開始前準備の異なる二要因が同じ着手失敗へ寄与している。"
      };
      candidates.push(compoundCandidate);
      appliedRuleCodes.push("explicit_multi_barrier_restores_compound");

      const sourceIntervention = interventions.find(
        (candidate) =>
          candidate.hypothesisId === choiceCandidate?.id ||
          candidate.hypothesisId === preparationCandidate?.id
      );

      interventions.push({
        id: uniqueId("app-explicit-choice-preparation-intervention", interventionIds),
        hypothesisId: compoundId,
        instruction:
          sourceIntervention?.instruction ??
          "使う教材を一冊だけにし、開始前の準備を一つだけ行う。",
        observableResult:
          sourceIntervention?.observableResult ??
          "教材を一冊に絞った後、作業を開始できたか。"
      });
    }
  }

  if (removedIds.size > 0) {
    const compoundCandidates = candidates.filter(
      (candidate) => candidate.code === "compound"
    );
    const directlySupportedComponents = candidates.filter(
      (candidate) =>
        candidate.code !== "compound" &&
        !unknownHypothesisCodes.has(candidate.code) &&
        (candidate.supportEvidenceIds.length > 0 ||
          candidate.stateFactorEvidenceIds.length > 0)
    );

    if (compoundCandidates.length > 0 && directlySupportedComponents.length < 2) {
      const orphanedIds = new Set(compoundCandidates.map((candidate) => candidate.id));
      candidates = candidates.filter((candidate) => !orphanedIds.has(candidate.id));
      interventions = interventions.filter(
        (candidate) => !orphanedIds.has(candidate.hypothesisId)
      );
      removedCodes.push("compound");
      appliedRuleCodes.push("orphaned_compound_removed_after_fact_conflict");
    }
  }

  if (appliedRuleCodes.length === 0) {
    return { extraction, audit: emptyAudit() };
  }

  const normalized = aiExtractionSchema.parse({
    ...extraction,
    evidence,
    hypothesisCandidates: candidates,
    interventionCandidates: interventions
  });

  return {
    extraction: normalized,
    audit: {
      appliedRuleCodes,
      removedHypothesisCodes: Array.from(new Set(removedCodes)),
      removedInterventionCount:
        extraction.interventionCandidates.length -
        extraction.interventionCandidates.filter(
          (candidate) => interventions.some((item) => item.id === candidate.id)
        ).length
    }
  };
}
