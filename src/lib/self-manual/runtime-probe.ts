import { ZodError } from "zod";

import {
  aiExtractionSchema,
  resolveAIExtraction
} from "./analysis-contract";
import type {
  AIExtractionResult,
  ResolvedAnalysis
} from "./analysis-contract";
import {
  normalizeExtractionAgainstExplicitEpisodeFacts
} from "./extraction-normalizer";
import type {
  ExtractionNormalizationAudit
} from "./extraction-normalizer";
import type {
  HypothesisCode,
  InterventionTrial
} from "./types";

export const probeFailureKinds = [
  "timeout",
  "network_error",
  "rate_limited",
  "provider_server_error",
  "provider_auth_error",
  "provider_rejected",
  "provider_refusal",
  "missing_output",
  "malformed_json",
  "schema_validation"
] as const;

export type ProbeFailureKind = (typeof probeFailureKinds)[number];

export class ProbeProviderError extends Error {
  readonly kind: ProbeFailureKind;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    kind: ProbeFailureKind,
    message: string,
    options: { retryable: boolean; statusCode?: number; cause?: unknown }
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ProbeProviderError";
    this.kind = kind;
    this.retryable = options.retryable;
    this.statusCode = options.statusCode;
  }
}

export type ProviderExtractionRequest = {
  episodeId: string;
  minimizedText: string;
  attempt: number;
};

export type StructuredExtractionProvider = {
  readonly providerName: string;
  readonly model: string;
  readonly apiRetrievalStorageRequested: false;
  extract(request: ProviderExtractionRequest): Promise<unknown>;
};

export type ProbeEpisode = {
  id: string;
  text: string;
  expectedCodes?: HypothesisCode[];
};

export type InputRedactionKind = "email" | "url" | "phone" | "long_numeric_id";

export type MinimizedProbeInput = {
  transmittedText: string;
  summary: {
    originalCharacterCount: number;
    transmittedCharacterCount: number;
    redactionCount: number;
    redactionKinds: InputRedactionKind[];
    truncated: boolean;
  };
};

export type ProbeAttemptRecord = {
  attempt: number;
  outcome: "success" | "failure";
  durationMs: number;
  failureKind: ProbeFailureKind | null;
  retryable: boolean | null;
  issuePaths: string[];
};

export type ProbeChecks = {
  semanticStatus: "passed" | "failed" | "not_evaluated";
  expectedCodesPresent: boolean | null;
  diagnosisDisabled: boolean | null;
  medicationAdviceDisabled: boolean | null;
  providerApiRetrievalStorageRequested: false;
  longTermMemoryWriteAttempted: false;
  manualEntryWriteAttempted: false;
};

export type PassedProbeResult = {
  status: "passed";
  providerName: string;
  model: string;
  episodeId: string;
  inputSummary: MinimizedProbeInput["summary"];
  attempts: ProbeAttemptRecord[];
  syntaxPassed: true;
  extraction: AIExtractionResult;
  normalizationAudit: ExtractionNormalizationAudit;
  resolved: ResolvedAnalysis;
  checks: ProbeChecks;
};

export type FailedProbeResult = {
  status: "failed";
  providerName: string;
  model: string;
  episodeId: string;
  inputSummary: MinimizedProbeInput["summary"];
  attempts: ProbeAttemptRecord[];
  syntaxPassed: false;
  terminalFailure: {
    kind: ProbeFailureKind;
    message: string;
  };
  checks: ProbeChecks;
};

export type ProbeResult = PassedProbeResult | FailedProbeResult;

export type ProbeRetryPolicy = {
  maxAttempts: number;
  retryDelayMs: number;
  retryableKinds: ProbeFailureKind[];
};

export const defaultProbeRetryPolicy: ProbeRetryPolicy = {
  maxAttempts: 2,
  retryDelayMs: 0,
  retryableKinds: [
    "timeout",
    "network_error",
    "rate_limited",
    "provider_server_error",
    "missing_output",
    "malformed_json",
    "schema_validation"
  ]
};

export type RunProbeOptions = {
  retryPolicy?: Partial<ProbeRetryPolicy>;
  maxInputCharacters?: number;
  trials?: InterventionTrial[];
};

const directIdentifierPatterns: Array<{
  kind: InputRedactionKind;
  pattern: RegExp;
  replacement: string;
}> = [
  {
    kind: "url",
    pattern: /https?:\/\/[^\s、。]+/giu,
    replacement: "[URL_REDACTED]"
  },
  {
    kind: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    replacement: "[EMAIL_REDACTED]"
  },
  {
    kind: "phone",
    pattern: /(?:\+81[-\s]?|0\d{1,4}[-\s]?)\d{1,4}[-\s]\d{3,4}\b/gu,
    replacement: "[PHONE_REDACTED]"
  },
  {
    kind: "long_numeric_id",
    pattern: /\b\d{12,}\b/gu,
    replacement: "[NUMERIC_ID_REDACTED]"
  }
];

export function minimizeProbeInput(text: string, maxCharacters = 2000): MinimizedProbeInput {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 200) {
    throw new Error("maxCharacters must be an integer of at least 200.");
  }

  const normalized = text.trim().replace(/\r\n?/gu, "\n");
  if (normalized.length === 0) {
    throw new Error("Probe input must not be empty.");
  }

  let redacted = normalized;
  let redactionCount = 0;
  const redactionKinds: InputRedactionKind[] = [];

  for (const rule of directIdentifierPatterns) {
    let matches = 0;
    redacted = redacted.replace(rule.pattern, () => {
      matches += 1;
      return rule.replacement;
    });
    if (matches > 0) {
      redactionCount += matches;
      redactionKinds.push(rule.kind);
    }
  }

  const truncated = redacted.length > maxCharacters;
  const transmittedText = truncated ? redacted.slice(0, maxCharacters) : redacted;

  return {
    transmittedText,
    summary: {
      originalCharacterCount: normalized.length,
      transmittedCharacterCount: transmittedText.length,
      redactionCount,
      redactionKinds,
      truncated
    }
  };
}

function normalizeFailure(error: unknown): ProbeProviderError {
  if (error instanceof ProbeProviderError) return error;

  if (error instanceof ZodError) {
    return new ProbeProviderError("schema_validation", "Provider output did not satisfy self-manual-v3.", {
      retryable: true,
      cause: error
    });
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new ProbeProviderError("timeout", "The provider request timed out.", {
      retryable: true,
      cause: error
    });
  }

  return new ProbeProviderError(
    "network_error",
    error instanceof Error ? error.message : "Unknown provider failure.",
    { retryable: true, cause: error }
  );
}

function issuePaths(error: unknown): string[] {
  if (!(error instanceof ZodError)) return [];
  return error.issues.map((issue) => issue.path.join(".")).filter((path) => path.length > 0);
}

function sleep(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function resolvedContainsExpectedCodes(
  resolved: ResolvedAnalysis,
  expectedCodes: HypothesisCode[] | undefined
): boolean | null {
  if (!expectedCodes || expectedCodes.length === 0) return null;
  const resolvedCodes = new Set(resolved.rankedHypotheses.map((hypothesis) => hypothesis.code));
  return expectedCodes.every((code) => resolvedCodes.has(code));
}

export async function runProviderProbe(
  provider: StructuredExtractionProvider,
  episode: ProbeEpisode,
  options: RunProbeOptions = {}
): Promise<ProbeResult> {
  const minimized = minimizeProbeInput(episode.text, options.maxInputCharacters ?? 2000);
  const retryPolicy: ProbeRetryPolicy = {
    maxAttempts: options.retryPolicy?.maxAttempts ?? defaultProbeRetryPolicy.maxAttempts,
    retryDelayMs: options.retryPolicy?.retryDelayMs ?? defaultProbeRetryPolicy.retryDelayMs,
    retryableKinds: options.retryPolicy?.retryableKinds ?? defaultProbeRetryPolicy.retryableKinds
  };

  if (!Number.isInteger(retryPolicy.maxAttempts) || retryPolicy.maxAttempts < 1 || retryPolicy.maxAttempts > 5) {
    throw new Error("Probe retry maxAttempts must be between 1 and 5.");
  }

  const attempts: ProbeAttemptRecord[] = [];
  let terminalFailure: ProbeProviderError | null = null;

  for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const raw = await provider.extract({
        episodeId: episode.id,
        minimizedText: minimized.transmittedText,
        attempt
      });
      const parsedExtraction = aiExtractionSchema.parse(raw);
      const normalizedExtraction = normalizeExtractionAgainstExplicitEpisodeFacts(
        parsedExtraction,
        minimized.transmittedText
      );
      const extraction = normalizedExtraction.extraction;
      const resolved = resolveAIExtraction(extraction, { trials: options.trials ?? [] });

      attempts.push({
        attempt,
        outcome: "success",
        durationMs: Date.now() - startedAt,
        failureKind: null,
        retryable: null,
        issuePaths: []
      });

      const expectedCodesPresent = resolvedContainsExpectedCodes(resolved, episode.expectedCodes);

      return {
        status: "passed",
        providerName: provider.providerName,
        model: provider.model,
        episodeId: episode.id,
        inputSummary: minimized.summary,
        attempts,
        syntaxPassed: true,
        extraction,
        normalizationAudit: normalizedExtraction.audit,
        resolved,
        checks: {
          semanticStatus:
            expectedCodesPresent === null ? "not_evaluated" : expectedCodesPresent ? "passed" : "failed",
          expectedCodesPresent,
          diagnosisDisabled: extraction.safety.isDiagnosis === false,
          medicationAdviceDisabled: extraction.safety.containsMedicationAdvice === false,
          providerApiRetrievalStorageRequested: provider.apiRetrievalStorageRequested,
          longTermMemoryWriteAttempted: false,
          manualEntryWriteAttempted: false
        }
      };
    } catch (error) {
      const normalized = normalizeFailure(error);
      const retryable =
        normalized.retryable &&
        retryPolicy.retryableKinds.includes(normalized.kind) &&
        attempt < retryPolicy.maxAttempts;

      attempts.push({
        attempt,
        outcome: "failure",
        durationMs: Date.now() - startedAt,
        failureKind: normalized.kind,
        retryable,
        issuePaths: issuePaths(error)
      });
      terminalFailure = normalized;

      if (!retryable) break;
      await sleep(retryPolicy.retryDelayMs);
    }
  }

  const failure = terminalFailure ?? new ProbeProviderError("provider_rejected", "Probe failed without a classified error.", {
    retryable: false
  });

  return {
    status: "failed",
    providerName: provider.providerName,
    model: provider.model,
    episodeId: episode.id,
    inputSummary: minimized.summary,
    attempts,
    syntaxPassed: false,
    terminalFailure: {
      kind: failure.kind,
      message: failure.message
    },
    checks: {
      semanticStatus: "not_evaluated",
      expectedCodesPresent: null,
      diagnosisDisabled: null,
      medicationAdviceDisabled: null,
      providerApiRetrievalStorageRequested: provider.apiRetrievalStorageRequested,
      longTermMemoryWriteAttempted: false,
      manualEntryWriteAttempted: false
    }
  };
}

export type ProbeStabilitySummary = {
  repeatCount: number;
  successfulRuns: number;
  allSyntaxPassed: boolean;
  allSemanticChecksPassed: boolean | null;
  allExpectedCodesPresent: boolean | null;
  primaryHypothesisAgreement: number;
  candidateSetAgreement: number;
  interventionPermissionAgreement: number;
  humanReviewAgreement: number;
  primaryCodeCounts: Record<string, number>;
  candidateSetCounts: Record<string, number>;
  privacyBoundariesHeld: boolean;
};

export type RepeatedProbeResult = {
  episodeId: string;
  runs: ProbeResult[];
  summary: ProbeStabilitySummary;
};

function agreement(values: string[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

function countValues(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

export async function runRepeatedProviderProbe(
  provider: StructuredExtractionProvider,
  episode: ProbeEpisode,
  repeatCount = 3,
  options: RunProbeOptions = {}
): Promise<RepeatedProbeResult> {
  if (!Number.isInteger(repeatCount) || repeatCount < 2 || repeatCount > 10) {
    throw new Error("repeatCount must be between 2 and 10.");
  }

  const runs: ProbeResult[] = [];
  for (let index = 0; index < repeatCount; index += 1) {
    runs.push(await runProviderProbe(provider, episode, options));
  }

  const successful = runs.filter((run): run is PassedProbeResult => run.status === "passed");
  const primaryCodes = successful.map((run) => run.resolved.rankedHypotheses[0].code);
  const candidateSets = successful.map((run) =>
    run.resolved.rankedHypotheses
      .map((hypothesis) => hypothesis.code)
      .sort()
      .join("|")
  );
  const interventionPermissions = successful.map((run) => String(run.resolved.interventionAllowed));
  const humanReviews = successful.map((run) => String(run.resolved.humanReviewRequired));
  const expectedChecks = successful
    .map((run) => run.checks.expectedCodesPresent)
    .filter((value): value is boolean => value !== null);

  return {
    episodeId: episode.id,
    runs,
    summary: {
      repeatCount,
      successfulRuns: successful.length,
      allSyntaxPassed: successful.length === repeatCount,
      allSemanticChecksPassed:
        expectedChecks.length === 0 ? null : expectedChecks.length === successful.length && expectedChecks.every(Boolean),
      allExpectedCodesPresent:
        expectedChecks.length === 0 ? null : expectedChecks.length === successful.length && expectedChecks.every(Boolean),
      primaryHypothesisAgreement: agreement(primaryCodes),
      candidateSetAgreement: agreement(candidateSets),
      interventionPermissionAgreement: agreement(interventionPermissions),
      humanReviewAgreement: agreement(humanReviews),
      primaryCodeCounts: countValues(primaryCodes),
      candidateSetCounts: countValues(candidateSets),
      privacyBoundariesHeld: runs.every(
        (run) =>
          run.checks.providerApiRetrievalStorageRequested === false &&
          run.checks.longTermMemoryWriteAttempted === false &&
          run.checks.manualEntryWriteAttempted === false
      )
    }
  };
}
