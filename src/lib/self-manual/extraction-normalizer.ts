import { aiExtractionSchema } from "./analysis-contract";
import type { AIExtractionResult } from "./analysis-contract";
import type { HypothesisCode } from "./types";

export const extractionNormalizationRuleCodes = [
  "explicit_known_completion_excludes_unclear_endpoint",
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

  if (!hasExplicitKnownCompletionCondition(episodeText)) {
    return { extraction, audit: emptyAudit() };
  }

  const endpointCandidates = extraction.hypothesisCandidates.filter(
    (candidate) => candidate.code === "unclear_endpoint"
  );
  const hasAnotherCandidate = extraction.hypothesisCandidates.some(
    (candidate) => candidate.code !== "unclear_endpoint"
  );

  if (endpointCandidates.length === 0 || !hasAnotherCandidate) {
    return { extraction, audit: emptyAudit() };
  }

  const removedIds = new Set(endpointCandidates.map((candidate) => candidate.id));
  const removedCodes: HypothesisCode[] = ["unclear_endpoint"];
  const appliedRuleCodes: ExtractionNormalizationRuleCode[] = [
    "explicit_known_completion_excludes_unclear_endpoint"
  ];

  let remainingCandidates = extraction.hypothesisCandidates.filter(
    (candidate) => !removedIds.has(candidate.id)
  );

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

  if (remainingCandidates.length === 0) {
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
