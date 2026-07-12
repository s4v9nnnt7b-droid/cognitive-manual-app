import { describe, expect, it } from "vitest";

import type { AIExtractionResult } from "./analysis-contract";
import {
  OpenAIResponsesExtractionProvider,
  selfManualV3JsonSchema
} from "./openai-responses-provider";
import {
  ProbeProviderError,
  minimizeProbeInput,
  runProviderProbe,
  runRepeatedProviderProbe
} from "./runtime-probe";
import type { StructuredExtractionProvider } from "./runtime-probe";

function validExtraction(episodeId = "probe-episode"): AIExtractionResult {
  return {
    analysisVersion: "self-manual-v3",
    episodeId,
    evidence: [
      {
        id: "e-1",
        kind: "reported_fact",
        statement: "選択肢が多く、比較を続けて開始しなかった。",
        source: "current_user_text",
        verification: "user_reported"
      }
    ],
    hypothesisCandidates: [
      {
        id: "h-1",
        code: "choice_overload",
        label: "選択過多",
        supportEvidenceIds: ["e-1"],
        counterEvidenceIds: [],
        stateFactorEvidenceIds: [],
        unknowns: [],
        rationale: "選択肢の比較中に停止したと報告されている。"
      }
    ],
    contradictions: [],
    additionalQuestions: [],
    interventionCandidates: [
      {
        id: "i-1",
        hypothesisId: "h-1",
        instruction: "候補を一件だけ表示する。",
        observableResult: "表示後に開始できたか。"
      }
    ],
    safety: {
      isDiagnosis: false,
      containsMedicationAdvice: false,
      requiresHumanReview: false,
      reviewReason: null
    }
  };
}

function sequenceProvider(sequence: unknown[]): StructuredExtractionProvider {
  let index = 0;
  return {
    providerName: "fake-provider",
    model: "fake-model",
    apiRetrievalStorageRequested: false,
    async extract() {
      const value = sequence[Math.min(index, sequence.length - 1)];
      index += 1;
      if (value instanceof Error) throw value;
      return structuredClone(value);
    }
  };
}

describe("runtime provider probe", () => {
  it("minimizes direct identifiers and limits transmitted text", () => {
    const input = `連絡先 test@example.com、https://example.com/private、090-1234-5678、123456789012345。${"あ".repeat(2200)}`;
    const minimized = minimizeProbeInput(input, 2000);

    expect(minimized.transmittedText).not.toContain("test@example.com");
    expect(minimized.transmittedText).not.toContain("https://example.com/private");
    expect(minimized.transmittedText).not.toContain("090-1234-5678");
    expect(minimized.transmittedText).not.toContain("123456789012345");
    expect(minimized.summary.redactionKinds).toEqual(
      expect.arrayContaining(["email", "url", "phone", "long_numeric_id"])
    );
    expect(minimized.summary.truncated).toBe(true);
    expect(minimized.summary.transmittedCharacterCount).toBe(2000);
  });

  it("validates extraction, resolves locally, and records no persistence writes", async () => {
    const originalText = "選択肢が多すぎて始められなかった。";
    const result = await runProviderProbe(sequenceProvider([validExtraction("case-1")]), {
      id: "case-1",
      text: originalText,
      expectedCodes: ["choice_overload"]
    });

    expect(result.status).toBe("passed");
    if (result.status !== "passed") return;

    expect(result.syntaxPassed).toBe(true);
    expect(result.resolved.rankedHypotheses[0].code).toBe("choice_overload");
    expect(result.checks.semanticStatus).toBe("passed");
    expect(result.checks.expectedCodesPresent).toBe(true);
    expect(result.checks.providerApiRetrievalStorageRequested).toBe(false);
    expect(result.checks.longTermMemoryWriteAttempted).toBe(false);
    expect(result.checks.manualEntryWriteAttempted).toBe(false);
    expect(JSON.stringify(result)).not.toContain(originalText);
  });

  it("retries a retryable provider failure once and then succeeds", async () => {
    const result = await runProviderProbe(
      sequenceProvider([
        new ProbeProviderError("timeout", "first attempt timed out", { retryable: true }),
        validExtraction("retry-case")
      ]),
      { id: "retry-case", text: "選択肢が多くて止まった。" }
    );

    expect(result.status).toBe("passed");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]).toMatchObject({
      outcome: "failure",
      failureKind: "timeout",
      retryable: true
    });
    expect(result.attempts[1].outcome).toBe("success");
  });

  it("retries schema-invalid output under the bounded policy", async () => {
    const invalid = {
      ...validExtraction("schema-retry"),
      formalRank: 1
    };
    const result = await runProviderProbe(
      sequenceProvider([invalid, validExtraction("schema-retry")]),
      { id: "schema-retry", text: "選択肢が多くて止まった。" }
    );

    expect(result.status).toBe("passed");
    expect(result.attempts[0].failureKind).toBe("schema_validation");
    expect(result.attempts).toHaveLength(2);
  });

  it("stops after the configured maximum attempts", async () => {
    const result = await runProviderProbe(
      sequenceProvider([
        new ProbeProviderError("provider_server_error", "server unavailable", {
          retryable: true,
          statusCode: 503
        })
      ]),
      { id: "failure-case", text: "始められなかった。" },
      { retryPolicy: { maxAttempts: 2 } }
    );

    expect(result.status).toBe("failed");
    expect(result.attempts).toHaveLength(2);
    if (result.status === "failed") {
      expect(result.terminalFailure.kind).toBe("provider_server_error");
    }
  });

  it("summarizes repeated-call stability without persisting raw text", async () => {
    const repeated = await runRepeatedProviderProbe(
      sequenceProvider([validExtraction("repeat-case")]),
      {
        id: "repeat-case",
        text: "選択肢が多すぎて始められなかった。",
        expectedCodes: ["choice_overload"]
      },
      3
    );

    expect(repeated.summary.successfulRuns).toBe(3);
    expect(repeated.summary.allSyntaxPassed).toBe(true);
    expect(repeated.summary.allSemanticChecksPassed).toBe(true);
    expect(repeated.summary.primaryHypothesisAgreement).toBe(1);
    expect(repeated.summary.candidateSetAgreement).toBe(1);
    expect(repeated.summary.interventionPermissionAgreement).toBe(1);
    expect(repeated.summary.humanReviewAgreement).toBe(1);
    expect(repeated.summary.allExpectedCodesPresent).toBe(true);
    expect(repeated.summary.privacyBoundariesHeld).toBe(true);
  });

  it("sends OpenAI a non-stored strict structured-output request", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const extraction = validExtraction("openai-case");
    const fakeFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(extraction)
                }
              ]
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const provider = new OpenAIResponsesExtractionProvider({
      apiKey: "test-key",
      model: "test-model",
      fetchImplementation: fakeFetch
    });
    const output = await provider.extract({
      episodeId: "openai-case",
      minimizedText: "選択肢が多すぎて始められなかった。",
      attempt: 1
    });

    expect(output).toEqual(extraction);
    if (capturedBody === null) throw new Error("OpenAI request body was not captured.");
    const requestBody = capturedBody as Record<string, unknown>;
    expect(requestBody.store).toBe(false);
    expect(requestBody.model).toBe("test-model");

    const format = (requestBody.text as { format?: Record<string, unknown> } | undefined)?.format;
    expect(format?.type).toBe("json_schema");
    expect(format?.strict).toBe(true);

    const schemaText = JSON.stringify(selfManualV3JsonSchema);
    expect(schemaText).not.toContain('"rank"');
    expect(schemaText).not.toContain('"confidence"');
    expect(schemaText).not.toContain('"recommendedIntervention"');
    expect(schemaText).not.toContain('"factEvidenceIds"');
  });

  it("classifies OpenAI rate limits as retryable without exposing the API key", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ error: { message: "rate limit" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      })) as typeof fetch;
    const provider = new OpenAIResponsesExtractionProvider({
      apiKey: "secret-key-that-must-not-leak",
      model: "test-model",
      fetchImplementation: fakeFetch
    });

    await expect(
      provider.extract({
        episodeId: "rate-limit-case",
        minimizedText: "始められなかった。",
        attempt: 1
      })
    ).rejects.toMatchObject({
      kind: "rate_limited",
      retryable: true,
      statusCode: 429
    });
  });
});
