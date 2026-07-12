import { describe, expect, it } from "vitest";

import { OpenAIResponsesExtractionProvider } from "./openai-responses-provider";
import { runRepeatedProviderProbe } from "./runtime-probe";
import { contractTestMatrix } from "./test-matrix";

const liveEnabled = process.env.RUN_LIVE_AI_PROBE === "1";
const apiKey = process.env.OPENAI_API_KEY ?? "";
const liveDescribe = liveEnabled && apiKey.length > 0 ? describe : describe.skip;

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

liveDescribe("live self-manual-v3 provider probe", () => {
  it(
    "runs minimized locked cases repeatedly without memory or ManualEntry writes",
    async () => {
      const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
      const repeatCount = boundedInteger(process.env.LIVE_PROBE_REPEAT_COUNT, 3, 2, 5);
      const caseLimit = boundedInteger(
        process.env.LIVE_PROBE_CASE_LIMIT,
        contractTestMatrix.length,
        1,
        contractTestMatrix.length
      );
      const provider = new OpenAIResponsesExtractionProvider({
        apiKey,
        model,
        timeoutMs: 60_000,
        maxOutputTokens: 4_000
      });

      const summaries: Array<Record<string, unknown>> = [];
      for (const testCase of contractTestMatrix.slice(0, caseLimit)) {
        const repeated = await runRepeatedProviderProbe(
          provider,
          {
            id: testCase.id,
            text: testCase.input,
            expectedCodes: testCase.expectedCodes
          },
          repeatCount,
          {
            retryPolicy: {
              maxAttempts: 2,
              retryDelayMs: 250
            }
          }
        );

        summaries.push({
          caseId: testCase.id,
          group: testCase.group,
          repeatCount,
          successfulRuns: repeated.summary.successfulRuns,
          allExpectedCodesPresent: repeated.summary.allExpectedCodesPresent,
          primaryHypothesisAgreement: repeated.summary.primaryHypothesisAgreement,
          candidateSetAgreement: repeated.summary.candidateSetAgreement,
          interventionPermissionAgreement: repeated.summary.interventionPermissionAgreement,
          humanReviewAgreement: repeated.summary.humanReviewAgreement,
          primaryCodeCounts: repeated.summary.primaryCodeCounts,
          privacyBoundariesHeld: repeated.summary.privacyBoundariesHeld
        });

        expect(repeated.summary.successfulRuns).toBe(repeatCount);
        expect(repeated.summary.allSyntaxPassed).toBe(true);
        expect(repeated.summary.allSemanticChecksPassed).toBe(true);
        expect(repeated.summary.privacyBoundariesHeld).toBe(true);

        if (testCase.id === "boundary-outside-taxonomy") {
          for (const run of repeated.runs) {
            expect(run.status).toBe("passed");
            if (run.status !== "passed") continue;
            expect(run.resolved.humanReviewRequired).toBe(true);
            expect(run.resolved.interventionAllowed).toBe(false);
            expect(run.resolved.selectedIntervention).toBeNull();
          }
        }
      }

      // Logs contain aggregate metrics only. Raw episode text and model output are intentionally omitted.
      console.log(
        JSON.stringify(
          {
            probe: "self-manual-v3-live-provider",
            provider: provider.providerName,
            model,
            caseLimit,
            repeatCount,
            summaries
          },
          null,
          2
        )
      );
    },
    15 * 60 * 1000
  );
});
