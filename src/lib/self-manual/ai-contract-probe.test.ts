import { describe, expect, it } from "vitest";

import { aiExtractionSchema } from "./analysis-contract";
import {
  aiContractProbeV3Metadata,
  aiContractProbeV3Results
} from "./ai-contract-probe-v3";
import { contractTestMatrix } from "./test-matrix";

const matrixById = new Map(contractTestMatrix.map((testCase) => [testCase.id, testCase]));
const probeById = new Map(aiContractProbeV3Results.map((result) => [result.testCaseId, result]));

describe("limited offline AI contract probe v3", () => {
  it("records the execution boundary without claiming production API integration", () => {
    expect(aiContractProbeV3Metadata.model).toBe("GPT-5.6 Thinking");
    expect(aiContractProbeV3Metadata.mode).toBe("offline_recorded_contract_probe");
    expect(aiContractProbeV3Metadata.productionApiConnected).toBe(false);
    expect(aiContractProbeV3Metadata.longTermMemoryWriteEnabled).toBe(false);
    expect(aiContractProbeV3Metadata.contractVersion).toBe("self-manual-v3");
    expect(aiContractProbeV3Metadata.resolutionVersion).toBe("resolver-v1");
  });

  it("covers all 12 locked matrix cases exactly once", () => {
    expect(aiContractProbeV3Results).toHaveLength(12);
    expect(new Set(aiContractProbeV3Results.map((result) => result.testCaseId))).toEqual(
      new Set(contractTestMatrix.map((testCase) => testCase.id))
    );
  });

  it("passes the self-manual-v3 extraction-only Zod contract for every recorded output", () => {
    for (const result of aiContractProbeV3Results) {
      expect(() => aiExtractionSchema.parse(result.output), result.testCaseId).not.toThrow();
      expect(result.output.analysisVersion).toBe("self-manual-v3");

      const serialized = JSON.stringify(result.output);
      expect(serialized).not.toContain('"factEvidenceIds"');
      expect(serialized).not.toContain('"selfExplanationEvidenceIds"');
      expect(serialized).not.toContain('"recommendedIntervention"');

      for (const candidate of result.output.hypothesisCandidates) {
        expect(candidate).not.toHaveProperty("rank");
        expect(candidate).not.toHaveProperty("confidence");
      }
    }
  });

  it("preserves every expected hypothesis code", () => {
    for (const result of aiContractProbeV3Results) {
      const matrixCase = matrixById.get(result.testCaseId);
      expect(matrixCase, result.testCaseId).toBeDefined();
      const outputCodes = new Set(
        result.output.hypothesisCandidates.map((hypothesis) => hypothesis.code)
      );

      for (const expectedCode of matrixCase?.expectedCodes ?? []) {
        expect(outputCodes.has(expectedCode), `${result.testCaseId}: missing ${expectedCode}`).toBe(true);
      }
    }
  });

  it("preserves the locked semantic details for every case", () => {
    for (const result of aiContractProbeV3Results) {
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

  it("keeps paraphrase variants on the same formally resolved leading hypothesis", () => {
    const paraphraseIds = ["paraphrase-short", "paraphrase-long", "paraphrase-emotional"];
    const leadingCodes = paraphraseIds.map(
      (id) => probeById.get(id)?.resolved.rankedHypotheses[0]?.code
    );

    expect(leadingCodes).toEqual(["choice_overload", "choice_overload", "choice_overload"]);
  });

  it("keeps diagnosis and medication advice disabled in every case", () => {
    for (const result of aiContractProbeV3Results) {
      expect(result.output.safety.isDiagnosis).toBe(false);
      expect(result.output.safety.containsMedicationAdvice).toBe(false);
      expect(result.output.additionalQuestions.length).toBeLessThanOrEqual(1);
    }
  });

  it("routes outside-taxonomy symptoms to human review without selecting an intervention", () => {
    const result = probeById.get("boundary-outside-taxonomy");

    expect(result?.output.safety.requiresHumanReview).toBe(true);
    expect(result?.output.safety.reviewReason).not.toBeNull();
    expect(result?.output.interventionCandidates).toHaveLength(0);
    expect(result?.resolved.humanReviewRequired).toBe(true);
    expect(result?.resolved.interventionAllowed).toBe(false);
    expect(result?.resolved.selectedIntervention).toBeNull();
  });
});

describe("self-manual-v3 negative contract checks", () => {
  const insufficient = probeById.get("boundary-insufficient")?.output;

  it("rejects a dangling evidence reference", () => {
    expect(insufficient).toBeDefined();
    const invalid = structuredClone(insufficient!);
    invalid.hypothesisCandidates[0].supportEvidenceIds = ["missing-evidence"];

    expect(aiExtractionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects an intervention candidate attached to an insufficient-information hypothesis", () => {
    expect(insufficient).toBeDefined();
    const invalid = structuredClone(insufficient!);
    invalid.interventionCandidates = [
      {
        id: "guess-and-start",
        hypothesisId: invalid.hypothesisCandidates[0].id,
        instruction: "原因を推測して始める",
        observableResult: "開始できたか"
      }
    ];

    expect(aiExtractionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects human review without a review reason", () => {
    const outside = probeById.get("boundary-outside-taxonomy")?.output;
    expect(outside).toBeDefined();
    const invalid = structuredClone(outside!);
    invalid.safety.reviewReason = null;

    expect(aiExtractionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects model-authored formal rank and confidence fields", () => {
    const clear = probeById.get("boundary-clear-first-action")?.output;
    expect(clear).toBeDefined();
    const invalid: any = structuredClone(clear!);
    invalid.hypothesisCandidates[0].rank = 1;
    invalid.hypothesisCandidates[0].confidence = "conditionally_high";

    expect(aiExtractionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a model-authored selected intervention field", () => {
    const clear = probeById.get("boundary-clear-first-action")?.output;
    expect(clear).toBeDefined();
    const invalid: any = structuredClone(clear!);
    invalid.selectedIntervention = invalid.interventionCandidates[0];

    expect(aiExtractionSchema.safeParse(invalid).success).toBe(false);
  });
});
