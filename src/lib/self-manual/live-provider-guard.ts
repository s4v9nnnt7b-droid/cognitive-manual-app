import { aiExtractionSchema } from "./analysis-contract";
import type {
  AIExtractionResult,
  AnalysisEvidence
} from "./analysis-contract";
import type {
  ProviderExtractionRequest,
  StructuredExtractionProvider
} from "./runtime-probe";
import { ProbeProviderError } from "./runtime-probe";

export type LiveExtractionGuardIssue = {
  path: string;
  rule: string;
};

function allowedVerificationForSource(source: AnalysisEvidence["source"]): AnalysisEvidence["verification"][] | null {
  if (source === "current_user_text") return ["user_reported"];
  if (source === "behavior_log") return ["observed", "verified"];
  if (source === "formal_test") return ["verified"];
  return null;
}

/**
 * Applies live-provider semantic rules that cannot be expressed reliably in the
 * provider JSON schema alone. The rules intentionally inspect metadata only;
 * they never include raw evidence statements in errors or logs.
 */
export function validateLiveExtractionSemantics(
  extraction: AIExtractionResult,
  request: ProviderExtractionRequest
): LiveExtractionGuardIssue[] {
  const issues: LiveExtractionGuardIssue[] = [];

  if (extraction.episodeId !== request.episodeId) {
    issues.push({
      path: "episodeId",
      rule: "response_episode_id_must_match_request"
    });
  }

  extraction.evidence.forEach((evidence, index) => {
    const allowed = allowedVerificationForSource(evidence.source);
    if (allowed !== null && !allowed.includes(evidence.verification)) {
      issues.push({
        path: `evidence.${index}.verification`,
        rule: `verification_not_allowed_for_${evidence.source}`
      });
    }
  });

  return issues;
}

/**
 * Wraps a provider so that live calls must satisfy both the extraction Zod
 * contract and the stricter request-correlation/source-verification rules
 * before the deterministic resolver can see the output.
 */
export function withLiveProviderGuards(
  provider: StructuredExtractionProvider
): StructuredExtractionProvider {
  return {
    providerName: provider.providerName,
    model: provider.model,
    apiRetrievalStorageRequested: false,
    async extract(request) {
      const raw = await provider.extract(request);
      const extraction = aiExtractionSchema.parse(raw);
      const issues = validateLiveExtractionSemantics(extraction, request);

      if (issues.length > 0) {
        throw new ProbeProviderError(
          "schema_validation",
          `Live extraction guard rejected provider output (${issues
            .map((issue) => `${issue.path}:${issue.rule}`)
            .join(",")}).`,
          { retryable: true }
        );
      }

      return extraction;
    }
  };
}
