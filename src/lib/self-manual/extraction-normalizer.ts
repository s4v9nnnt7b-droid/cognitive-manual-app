import { aiExtractionSchema } from "./analysis-contract";
import type { AIExtractionResult } from "./analysis-contract";
import type { HypothesisCode } from "./types";

export const extractionNormalizationRuleCodes = [
  "explicit_known_completion_excludes_unclear_endpoint",
  "explicit_choice_overload_subsumes_unclear_first_action",
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

function splitClauses(text: string): string[] {
  return text
    .normalize("NFKC")
    .split(/[。！？!?\n]+/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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
  const removedIds = new Set<string>();
  const removedCodes: HypothesisCode[] = [];
  const appliedRuleCodes: ExtractionNormalizationRuleCode[] = [];
  const hasCode = (code: HypothesisCode) =>
    extraction.hypothesisCandidates.some((candidate) => candidate.code === code);

  if (
    hasExplicitKnownCompletionCondition(episodeText) &&
    hasCode("unclear_endpoint") &&
    extraction.hypothesisCandidates.some((candidate) => candidate.code !== "unclear_endpoint")
  ) {
    for (const candidate of extraction.hypothesisCandidates) {
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
    for (const candidate of extraction.hypothesisCandidates) {
      if (candidate.code === "unclear_first_action") removedIds.add(candidate.id);
    }
    removedCodes.push("unclear_first_action");
    appliedRuleCodes.push("explicit_choice_overload_subsumes_unclear_first_action");
  }

  let remainingCandidates = extraction.hypothesisCandidates.filter(
    (candidate) => !removedIds.has(candidate.id)
  );

  if (removedIds.size > 0) {
    const compoundCandidates = remainingCandidates.filter(
      (candidate) => candidate.code === "compound"
    );
    const directlySupportedComponents = remainingCandidates.filter(
      (candidate) =>
        candidate.code !== "compound" &&
        !unknownHypothesisCodes.has(candidate.code) &&
        (candidate.supportEvidenceIds.length > 0 ||
          candidate.stateFactorEvidenceIds.length > 0)
    );

    if (compoundCandidates.length > 0 && directlySupportedComponents.length < 2) {
      for (const compound of compoundCandidates) removedIds.add(compound.id);
      remainingCandidates = remainingCandidates.filter(
        (candidate) => candidate.code !== "compound"
      );
      removedCodes.push("compound");
      appliedRuleCodes.push("orphaned_compound_removed_after_fact_conflict");
    }
  }

  if (removedIds.size === 0 || remainingCandidates.length === 0) {
    return { extraction, audit: emptyAudit() };
  }

  const remainingInterventions = extraction.interventionCandidates.filter(
    (candidate) => !removedIds.has(candidate.hypothesisId)
  );
  const normalized = aiExtractionSchema.parse({
    ...extraction,
    hypothesisCandidates: remainingCandidates,
    interventionCandidates: remainingInterventions
  });

  return {
    extraction: normalized,
    audit: {
      appliedRuleCodes,
      removedHypothesisCodes: Array.from(new Set(removedCodes)),
      removedInterventionCount:
        extraction.interventionCandidates.length - remainingInterventions.length
    }
  };
}
