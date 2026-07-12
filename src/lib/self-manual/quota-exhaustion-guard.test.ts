import { describe, expect, it } from "vitest";

import { withQuotaExhaustionGuard } from "./quota-exhaustion-guard";
import {
  ProbeProviderError,
  runProviderProbe
} from "./runtime-probe";
import type { StructuredExtractionProvider } from "./runtime-probe";

function failingProvider(error: Error): StructuredExtractionProvider {
  return {
    providerName: "fake-provider",
    model: "fake-model",
    apiRetrievalStorageRequested: false,
    async extract() {
      throw error;
    }
  };
}

describe("provider quota exhaustion guard", () => {
  it("stops immediately when a 429 reports exhausted quota", async () => {
    const provider = withQuotaExhaustionGuard(
      failingProvider(
        new ProbeProviderError(
          "rate_limited",
          "You exceeded your current quota, please check your plan and billing details.",
          { retryable: true, statusCode: 429 }
        )
      )
    );

    const result = await runProviderProbe(
      provider,
      { id: "quota-case", text: "始められなかった。" },
      { retryPolicy: { maxAttempts: 2 } }
    );

    expect(result.status).toBe("failed");
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]).toMatchObject({
      failureKind: "provider_rejected",
      retryable: false
    });
    if (result.status === "failed") {
      expect(result.terminalFailure.message).toContain("quota is exhausted");
    }
  });

  it("keeps an ordinary temporary rate limit retryable", async () => {
    const provider = withQuotaExhaustionGuard(
      failingProvider(
        new ProbeProviderError("rate_limited", "Too many requests.", {
          retryable: true,
          statusCode: 429
        })
      )
    );

    const result = await runProviderProbe(
      provider,
      { id: "rate-case", text: "始められなかった。" },
      { retryPolicy: { maxAttempts: 2 } }
    );

    expect(result.status).toBe("failed");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].failureKind).toBe("rate_limited");
    expect(result.attempts[0].retryable).toBe(true);
  });
});
