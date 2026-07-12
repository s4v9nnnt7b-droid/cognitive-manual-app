import {
  aiExtractionSchema,
  resolveAIExtraction
} from "./analysis-contract";
import type {
  AIExtractionResult,
  ResolvedAnalysis
} from "./analysis-contract";
import {
  aiContractProbeMetadata,
  aiContractProbeResults as legacyAiContractProbeResults
} from "./ai-contract-probe";
import type { AIAnalysis } from "./schemas";

export const aiContractProbeV3Metadata = {
  ...aiContractProbeMetadata,
  sourceContractVersion: "self-manual-v2",
  contractVersion: "self-manual-v3",
  resolutionVersion: "resolver-v1",
  legacyFixtureMigrationOnly: true
} as const;

export type AIContractProbeV3Result = {
  testCaseId: string;
  output: AIExtractionResult;
  resolved: ResolvedAnalysis;
};

/**
 * Converts the locked v2 recorded fixtures into the v3 extraction-only contract.
 * The old rank, confidence, fact/self-explanation index arrays, and selected
 * intervention are intentionally not carried into the formal result.
 */
export function migrateRecordedV2Output(output: AIAnalysis): AIExtractionResult {
  const migrated: AIExtractionResult = {
    analysisVersion: "self-manual-v3",
    episodeId: output.episodeId,
    evidence: output.evidence,
    hypothesisCandidates: output.hypotheses.map((hypothesis) => ({
      id: hypothesis.id,
      code: hypothesis.code,
      label: hypothesis.label,
      supportEvidenceIds: hypothesis.supportEvidenceIds,
      counterEvidenceIds: hypothesis.counterEvidenceIds,
      stateFactorEvidenceIds: hypothesis.stateFactorEvidenceIds,
      unknowns: hypothesis.unknowns,
      rationale: hypothesis.rationale
    })),
    contradictions: output.unresolvedContradictions,
    additionalQuestions: output.additionalQuestions,
    interventionCandidates: output.recommendedIntervention
      ? [
          {
            id: output.recommendedIntervention.interventionId,
            hypothesisId: output.recommendedIntervention.hypothesisId,
            instruction: output.recommendedIntervention.instruction,
            observableResult: output.recommendedIntervention.observableResult
          }
        ]
      : [],
    safety: output.safety
  };

  return aiExtractionSchema.parse(migrated);
}

export const aiContractProbeV3Results: AIContractProbeV3Result[] =
  legacyAiContractProbeResults.map((result) => {
    const output = migrateRecordedV2Output(result.output);
    return {
      testCaseId: result.testCaseId,
      output,
      resolved: resolveAIExtraction(output)
    };
  });
