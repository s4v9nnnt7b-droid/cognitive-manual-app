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

function sameCodeSet(left: string[], right: string[]): boolean {
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
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
              failureKind: run.terminalFailure.kind,
              semanticMismatches: ["provider_failure"]
            };
          }

          const primaryCode = run.resolved.rankedHypotheses[0].code;
          const candidateCodes = run.resolved.rankedHypotheses
            .map((hypothesis) => hypothesis.code)
            .sort();
          const candidateCodeSet = new Set(candidateCodes);
          const semanticMismatches: string[] = [];

          if (!testCase.expectedPrimaryCodes.includes(primaryCode)) {
            semanticMismatches.push("unexpected_primary_code");
          }
          if (!sameCodeSet(candidateCodes, testCase.expectedCandidateCodes)) {
            semanticMismatches.push("unexpected_candidate_set");
          }
          if (run.resolved.interventionAllowed !== testCase.expectedInterventionAllowed) {
            semanticMismatches.push("unexpected_intervention_permission");
          }
          if (run.resolved.humanReviewRequired !== testCase.expectedHumanReviewRequired) {
            semanticMismatches.push("unexpected_human_review_state");
          }
          if (
            (run.resolved.additionalQuestion !== null) !==
            testCase.expectedAdditionalQuestionPresent
          ) {
            semanticMismatches.push("unexpected_additional_question_state");
          }

          return {
            run: index + 1,
            status: run.status,
            primaryCode,
            candidateCodes,
            missingExpectedCodes: testCase.expectedCodes.filter((code) => !candidateCodeSet.has(code)),
            interventionAllowed: run.resolved.interventionAllowed,
            selectedInterventionPresent: run.resolved.selectedIntervention !== null,
            humanReviewRequired: run.resolved.humanReviewRequired,
            additionalQuestionPresent: run.resolved.additionalQuestion !== null,
            semanticMismatches
          };
        });

        const strictSemanticRunsPassed = runSummaries.filter(
          (summary) => summary.status === "passed" && summary.semanticMismatches.length === 0
        ).length;

        const caseSummary = {
          caseId: testCase.id,
          group: testCase.group,
          repeatCount,
          successfulRuns: repeated.summary.successfulRuns,
          strictSemanticRunsPassed,
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
        expect.soft(strictSemanticRunsPassed).toBe(repeatCount);
        expect.soft(repeated.summary.privacyBoundariesHeld).toBe(true);
        expect.soft(repeated.summary.primaryHypothesisAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect.soft(repeated.summary.candidateSetAgreement).toBeGreaterThanOrEqual(minimumAgreement);
        expect.soft(repeated.summary.interventionPermissionAgreement).toBe(1);
        expect.soft(repeated.summary.humanReviewAgreement).toBe(1);

        for (const run of repeated.runs) {
          expect.soft(run.status).toBe("passed");
          if (run.status !== "passed") continue;

          const primaryCode = run.resolved.rankedHypotheses[0].code;
          const candidateCodes = run.resolved.rankedHypotheses
            .map((hypothesis) => hypothesis.code)
            .sort();

          expect.soft(run.extraction.episodeId).toBe(testCase.id);
          expect.soft(testCase.expectedPrimaryCodes).toContain(primaryCode);
          expect.soft(candidateCodes).toEqual([...testCase.expectedCandidateCodes].sort());
          expect.soft(run.resolved.interventionAllowed).toBe(testCase.expectedInterventionAllowed);
          expect.soft(run.resolved.humanReviewRequired).toBe(testCase.expectedHumanReviewRequired);
          expect.soft(run.resolved.additionalQuestion !== null).toBe(
            testCase.expectedAdditionalQuestionPresent
          );
          if (testCase.expectedInterventionAllowed) {
            expect.soft(run.resolved.selectedIntervention).not.toBeNull();
          } else {
            expect.soft(run.resolved.selectedIntervention).toBeNull();
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