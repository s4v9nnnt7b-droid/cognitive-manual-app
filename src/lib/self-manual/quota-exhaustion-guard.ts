import type {
  ProviderExtractionRequest,
  StructuredExtractionProvider
} from "./runtime-probe";
import { ProbeProviderError } from "./runtime-probe";

const quotaExhaustionPattern =
  /exceeded your current quota|check your plan and billing details|insufficient[_\s-]?quota|credit balance|monthly spend limit/iu;

/**
 * Converts non-recoverable provider quota exhaustion into an immediate stop.
 * Temporary 429 rate limits remain retryable and keep their original type.
 */
export function withQuotaExhaustionGuard(
  provider: StructuredExtractionProvider
): StructuredExtractionProvider {
  return {
    providerName: provider.providerName,
    model: provider.model,
    apiRetrievalStorageRequested: false,
    async extract(request: ProviderExtractionRequest) {
      try {
        return await provider.extract(request);
      } catch (error) {
        if (
          error instanceof ProbeProviderError &&
          error.kind === "rate_limited" &&
          quotaExhaustionPattern.test(error.message)
        ) {
          throw new ProbeProviderError(
            "provider_rejected",
            "Provider quota is exhausted; retry is disabled until billing or limits are updated.",
            {
              retryable: false,
              statusCode: error.statusCode,
              cause: error
            }
          );
        }
        throw error;
      }
    }
  };
}
