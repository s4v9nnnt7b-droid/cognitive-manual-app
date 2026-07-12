import { describe, expect, it } from "vitest";

import { withLiveProviderGuards } from "./live-provider-guard";
import { selectLiveProbeCases } from "./live-probe-case-selection";
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
      const selectedCases = selectLiveProbeCases(caseLimit, process.env.LIVE_PROBE_CASE_IDS);
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
      for (const testCase of selectedCases) {
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

        const runSummaries = repeated.runs.map((run, index) => {
          if (run.status === "failed") {
            return {
              run: index + 1,
              status: run.status,
              failureKind: run.terminalFailure.kind
            };
          }

          const candidateCodes = run.resolved.rankedHypotheses
            .map((hypothesis) => hypothesis.code)
            .sort();
          const candidateCodeSet = new Set(candidateCodes);

          return {
            run: index + 1,
            status: run.status,
            primaryCode: run.resolved.rankedHypotheses[0].code,
            candidateCodes,
            missingExpectedCodes: testCase.expectedCodes.filter((code) => !candidateCodeSet.has(code)),
            interventionAllowed: run.resolved.interventionAllowed,
            selectedInterventionPresent: run.resolved.selectedIntervention !== null,
            humanReviewRequired: run.resolved.humanReviewRequired,
            additionalQuestionPresent: run.resolved.additionalQuestion !== null
          };
        });

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
          candidateSetCounts: repeated.summary.candidateSetCounts,
          privacyBoundariesHeld: repeated.summary.privacyBoundariesHeld,
          runSummaries,
          failureSummaries
        };
        summaries.push(caseSummary);

        // Print only aggregate metadata and classified failures before assertions.
        // Raw episode text, evidence statements, model prose, and credentials are intentionally omitted.
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

        // Soft assertions allow a full 12-case run to collect every safe summary
        // before the test reports any semantic or stability failure.
        expect.soft(repeated.summary.successfulRuns).toBe(repeatCount);
        expect.soft(repeated.summary.allSyntaxPassed).toBe(true);
        expect.soft(repeated.summary.allSemanticChecksPassed).toBe(true);
        expect.soft(repeated.summary.privacyBoundariesHeld).toBe(true);
        expect.soft(repeated.summary.primaryHypothesisAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect.soft(repeated.summary.candidateSetAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect.soft(repeated.summary.interventionPermissionAgreement).toBe(1);
        expect.soft(repeated.summary.humanReviewAgreement).toBe(1);

        for (const run of repeated.runs) {
          expect.soft(run.status).toBe("passed");
          if (run.status !== "passed") continue;
          expect.soft(run.extraction.episodeId).toBe(testCase.id);

          if (testCase.id === "boundary-outside-taxonomy") {
            expect.soft(run.resolved.humanReviewRequired).toBe(true);
            expect.soft(run.resolved.interventionAllowed).toBe(false);
            expect.soft(run.resolved.selectedIntervention).toBeNull();
          }

          if (testCase.id === "boundary-insufficient") {
            expect.soft(run.resolved.interventionAllowed).toBe(false);
            expect.soft(run.resolved.selectedIntervention).toBeNull();
            expect.soft(run.resolved.additionalQuestion).not.toBeNull();
          }
        }
      }

      console.log(
        JSON.stringify(
          {
            probe: "self-manual-v3-live-provider",
            provider: provider.providerName,
            model,
            caseLimit: selectedCases.length,
            selectedCaseIds: selectedCases.map((testCase) => testCase.id),
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
