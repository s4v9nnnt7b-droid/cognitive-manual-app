import { describe, expect, it } from "vitest";

import { withLiveProviderGuards } from "./live-provider-guard";
import { OpenAIResponsesExtractionProvider } from "./openai-responses-provider";
import { withQuotaExhaustionGuard } from "./quota-exhaustion-guard";
import { runRepeatedProviderProbe } from "./runtime-probe";
import { contractTestMatrix } from "./test-matrix";

const liveEnabled = process.env.RUN_LIVE_AI_PROBE === "1";
const apiKey = process.env.OPENAI_API_KEY ?? "";
const model = process.env.OPENAI_MODEL ?? "";
const liveDescribe = liveEnabled ? describe : describe.skip;

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function boundedRatio(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function prioritizedCases(limit: number) {
  const priorityIds = [
    "boundary-outside-taxonomy",
    "boundary-insufficient",
    "boundary-clear-first-action"
  ];
  const byId = new Map(contractTestMatrix.map((testCase) => [testCase.id, testCase]));
  const ordered = [
    ...priorityIds.map((id) => byId.get(id)).filter((value): value is (typeof contractTestMatrix)[number] => Boolean(value)),
    ...contractTestMatrix.filter((testCase) => !priorityIds.includes(testCase.id))
  ];
  return ordered.slice(0, limit);
}

liveDescribe("live self-manual-v3 provider probe", () => {
  it(
    "runs minimized locked cases repeatedly without memory or ManualEntry writes",
    async () => {
      if (apiKey.trim().length === 0) {
        throw new Error("RUN_LIVE_AI_PROBE=1 requires OPENAI_API_KEY.");
      }
      if (model.trim().length === 0) {
        throw new Error("RUN_LIVE_AI_PROBE=1 requires OPENAI_MODEL.");
      }

      const repeatCount = boundedInteger(process.env.LIVE_PROBE_REPEAT_COUNT, 3, 2, 5);
      const caseLimit = boundedInteger(
        process.env.LIVE_PROBE_CASE_LIMIT,
        Math.min(3, contractTestMatrix.length),
        1,
        contractTestMatrix.length
      );
      const minimumAgreement = boundedRatio(process.env.LIVE_PROBE_MIN_AGREEMENT, 2 / 3);
      const provider = withLiveProviderGuards(
        withQuotaExhaustionGuard(
          new OpenAIResponsesExtractionProvider({
            apiKey,
            model,
            timeoutMs: 60_000,
            maxOutputTokens: 4_000
          })
        )
      );

      const summaries: Array<Record<string, unknown>> = [];
      for (const testCase of prioritizedCases(caseLimit)) {
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

        const failureSummaries = repeated.runs
          .filter((run) => run.status === "failed")
          .map((run) => ({
            terminalFailure: run.status === "failed" ? run.terminalFailure : null,
            attempts: run.attempts.map((attempt) => ({
              attempt: attempt.attempt,
              outcome: attempt.outcome,
              durationMs: attempt.durationMs,
              failureKind: attempt.failureKind,
              retryable: attempt.retryable,
              issuePaths: attempt.issuePaths
            }))
          }));

        const caseSummary = {
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
          privacyBoundariesHeld: repeated.summary.privacyBoundariesHeld,
          failureSummaries
        };
        summaries.push(caseSummary);

        // Print only aggregate and classified failure diagnostics before assertions.
        // Raw episode text, raw provider output, and API credentials are intentionally omitted.
        console.log(
          JSON.stringify(
            {
              probe: "self-manual-v3-live-provider-case",
              provider: provider.providerName,
              model,
              minimumAgreement,
              summary: caseSummary
            },
            null,
            2
          )
        );

        expect(repeated.summary.successfulRuns).toBe(repeatCount);
        expect(repeated.summary.allSyntaxPassed).toBe(true);
        expect(repeated.summary.allSemanticChecksPassed).toBe(true);
        expect(repeated.summary.privacyBoundariesHeld).toBe(true);
        expect(repeated.summary.primaryHypothesisAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect(repeated.summary.candidateSetAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect(repeated.summary.interventionPermissionAgreement).toBe(1);
        expect(repeated.summary.humanReviewAgreement).toBe(1);

        for (const run of repeated.runs) {
          expect(run.status).toBe("passed");
          if (run.status !== "passed") continue;
          expect(run.extraction.episodeId).toBe(testCase.id);

          if (testCase.id === "boundary-outside-taxonomy") {
            expect(run.resolved.humanReviewRequired).toBe(true);
            expect(run.resolved.interventionAllowed).toBe(false);
            expect(run.resolved.selectedIntervention).toBeNull();
          }

          if (testCase.id === "boundary-insufficient") {
            expect(run.resolved.interventionAllowed).toBe(false);
            expect(run.resolved.selectedIntervention).toBeNull();
            expect(run.resolved.additionalQuestion).not.toBeNull();
          }
        }
      }

      console.log(
        JSON.stringify(
          {
            probe: "self-manual-v3-live-provider",
            provider: provider.providerName,
            model,
            caseLimit,
            repeatCount,
            minimumAgreement,
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
