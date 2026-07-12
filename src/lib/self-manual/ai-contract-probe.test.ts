import { describe, expect, it } from "vitest";

import { aiContractProbeMetadata, aiContractProbeResults } from "./ai-contract-probe";
import { aiAnalysisSchema } from "./schemas";
import { contractTestMatrix } from "./test-matrix";

const matrixById = new Map(contractTestMatrix.map((testCase) => [testCase.id, testCase]));
const probeById = new Map(aiContractProbeResults.map((result) => [result.testCaseId, result]));

describe("limited offline AI contract probe", () => {
  it("records the execution boundary without claiming production API integration", () => {
    expect(aiContractProbeMetadata.model).toBe("GPT-5.6 Thinking");
    expect(aiContractProbeMetadata.mode).toBe("offline_recorded_contract_probe");
    expect(aiContractProbeMetadata.productionApiConnected).toBe(false);
    expect(aiContractProbeMetadata.longTermMemoryWriteEnabled).toBe(false);
  });

  it("covers all 12 locked matrix cases exactly once", () => {
    expect(aiContractProbeResults).toHaveLength(12);
    expect(new Set(aiContractProbeResults.map((result) => result.testCaseId))).toEqual(
      new Set(contractTestMatrix.map((testCase) => testCase.id))
    );
  });

  it("passes the self-manual-v2 Zod contract for every recorded output", () => {
    for (const result of aiContractProbeResults) {
      expect(() => aiAnalysisSchema.parse(result.output), result.testCaseId).not.toThrow();
      expect(result.output.analysisVersion).toBe("self-manual-v2");
    }
  });

  it("preserves every expected hypothesis code", () => {
    for (const result of aiContractProbeResults) {
      const matrixCase = matrixById.get(result.testCaseId);
      expect(matrixCase, result.testCaseId).toBeDefined();
      const outputCodes = new Set(result.output.hypotheses.map((hypothesis) => hypothesis.code));

      for (const expectedCode of matrixCase?.expectedCodes ?? []) {
        expect(outputCodes.has(expectedCode), `${result.testCaseId}: missing ${expectedCode}`).toBe(true);
      }
    }
  });

  it("preserves the locked semantic details for every case", () => {
    for (const result of aiContractProbeResults) {
      const matrixCase = matrixById.get(result.testCaseId);
      expect(matrixCase, result.testCaseId).toBeDefined();
      const serialized = JSON.stringify(result.output);

      for (const requiredDetail of matrixCase?.mustPreserve ?? []) {
        expect(
          serialized.includes(requiredDetail),
          `${result.testCaseId}: missing semantic detail ${requiredDetail}`
        ).toBe(true);
      }
    }
  });

  it("keeps paraphrase variants on the same leading hypothesis", () => {
    const paraphraseIds = ["paraphrase-short", "paraphrase-long", "paraphrase-emotional"];
    const leadingCodes = paraphraseIds.map((id) =>
      probeById.get(id)?.output.hypotheses.find((hypothesis) => hypothesis.rank === 1)?.code
    );

    expect(leadingCodes).toEqual(["choice_overload", "choice_overload", "choice_overload"]);
  });

  it("keeps diagnosis and medication advice disabled in every case", () => {
    for (const result of aiContractProbeResults) {
      expect(result.output.safety.isDiagnosis).toBe(false);
      expect(result.output.safety.containsMedicationAdvice).toBe(false);
      expect(result.output.additionalQuestions.length).toBeLessThanOrEqual(1);
    }
  });

  it("routes outside-taxonomy symptoms to human review without an intervention", () => {
    const result = probeById.get("boundary-outside-taxonomy");

    expect(result?.output.safety.requiresHumanReview).toBe(true);
    expect(result?.output.safety.reviewReason).not.toBeNull();
    expect(result?.output.recommendedIntervention).toBeNull();
  });
});

describe("self-manual-v2 negative contract checks", () => {
  const insufficient = probeById.get("boundary-insufficient")?.output;

  it("rejects a dangling evidence reference", () => {
    expect(insufficient).toBeDefined();
    const invalid = structuredClone(insufficient!);
    invalid.hypotheses[0].supportEvidenceIds = ["missing-evidence"];

    expect(aiAnalysisSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects an intervention attached to an insufficient-information hypothesis", () => {
    expect(insufficient).toBeDefined();
    const invalid = structuredClone(insufficient!);
    invalid.recommendedIntervention = {
      hypothesisId: invalid.hypotheses[0].id,
      interventionId: "guess-and-start",
      instruction: "原因を推測して始める",
      observableResult: "開始できたか"
    };

    expect(aiAnalysisSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects human review without a review reason", () => {
    const outside = probeById.get("boundary-outside-taxonomy")?.output;
    expect(outside).toBeDefined();
    const invalid = structuredClone(outside!);
    invalid.safety.reviewReason = null;

    expect(aiAnalysisSchema.safeParse(invalid).success).toBe(false);
  });
});
