import { hypothesisCodes } from "./types";
import {
  analysisEvidenceKinds,
  analysisEvidenceSources,
  verificationStatuses
} from "./analysis-contract";
import type {
  ProviderExtractionRequest,
  StructuredExtractionProvider
} from "./runtime-probe";
import { ProbeProviderError } from "./runtime-probe";

export const selfManualV3JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "analysisVersion",
    "episodeId",
    "evidence",
    "hypothesisCandidates",
    "contradictions",
    "additionalQuestions",
    "interventionCandidates",
    "safety"
  ],
  properties: {
    analysisVersion: {
      type: "string",
      enum: ["self-manual-v3"]
    },
    episodeId: {
      type: "string",
      minLength: 1
    },
    evidence: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "statement", "source", "verification"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { type: "string", enum: [...analysisEvidenceKinds] },
          statement: { type: "string", minLength: 1 },
          source: { type: "string", enum: [...analysisEvidenceSources] },
          verification: { type: "string", enum: [...verificationStatuses] }
        }
      }
    },
    hypothesisCandidates: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "code",
          "label",
          "supportEvidenceIds",
          "counterEvidenceIds",
          "stateFactorEvidenceIds",
          "unknowns",
          "rationale"
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          code: { type: "string", enum: [...hypothesisCodes] },
          label: { type: "string", minLength: 1 },
          supportEvidenceIds: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          counterEvidenceIds: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          stateFactorEvidenceIds: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          unknowns: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          rationale: { type: "string", minLength: 1 }
        }
      }
    },
    contradictions: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "evidenceIds", "description"],
        properties: {
          id: { type: "string", minLength: 1 },
          evidenceIds: {
            type: "array",
            minItems: 2,
            items: { type: "string", minLength: 1 }
          },
          description: { type: "string", minLength: 1 }
        }
      }
    },
    additionalQuestions: {
      type: "array",
      maxItems: 1,
      items: { type: "string", minLength: 1 }
    },
    interventionCandidates: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "hypothesisId", "instruction", "observableResult"],
        properties: {
          id: { type: "string", minLength: 1 },
          hypothesisId: { type: "string", minLength: 1 },
          instruction: { type: "string", minLength: 1 },
          observableResult: { type: "string", minLength: 1 }
        }
      }
    },
    safety: {
      type: "object",
      additionalProperties: false,
      required: ["isDiagnosis", "containsMedicationAdvice", "requiresHumanReview", "reviewReason"],
      properties: {
        isDiagnosis: { type: "boolean", enum: [false] },
        containsMedicationAdvice: { type: "boolean", enum: [false] },
        requiresHumanReview: { type: "boolean" },
        reviewReason: { type: ["string", "null"] }
      }
    }
  }
} as const;

export const selfManualExtractionSystemPrompt = `You are an extraction component for a non-diagnostic self-manual application.

Your only job is to convert one minimized task-start episode into self-manual-v3 structured extraction data.

Grounding rules:
- Extract only statements grounded in the supplied text. Do not invent history, diagnoses, test results, medication effects, observer evidence, or hidden motives.
- Keep reported facts, self-explanations, temporary state factors, counterevidence, and user corrections distinct.
- A self-blaming label such as "lazy" is a self_explanation. It is not direct evidence of low reward, low priority, or inability.
- An emotional consequence such as frustration, annoyance, or "I hated it" is not a second cause unless the text independently supports fear, evaluation threat, or failure avoidance.
- Do not emit a hypothesis candidate that is directly contradicted by an explicit known-condition statement in the same episode unless separate text independently supports that candidate. If such an alternative is preserved, link the contradicting evidence through counterEvidenceIds.
- A positive contrast may support a hypothesis provisionally. For example, starting another task when its first step and endpoint were explicit supports those missing-condition candidates, but the current failed task still requires confirmation.

Hypothesis code boundaries:
- unclear_endpoint: the finish condition, required scope, deadline, or definition of done is unclear. Do not use it merely because the first action is unclear. If the text explicitly says the finish condition, completion criteria, deadline, required scope, or definition of done is known, treat that as direct counterevidence and do not emit unclear_endpoint unless a separate explicit endpoint ambiguity remains.
- unclear_first_action: the target task is known but the first concrete operation is not identified or cannot be chosen. Comparing a small number of possible first steps remains unclear_first_action unless many parallel tasks, materials, or options are competing.
- choice_overload: multiple tasks, materials, or options are simultaneously salient and comparison or selection among them causes stopping.
- When wording such as "what should I do first" is explained solely by several simultaneously important options, emit choice_overload only. Do not duplicate unclear_first_action unless a separate concrete-operation ambiguity remains after the choice is narrowed.
- preparation_load: gathering, arranging, clearing, locating, opening, or setting up materials before the actual task creates startup friction. Multiple visible materials alone are not sufficient without setup or preparation work.
- anxiety_or_failure_avoidance: the text explicitly supports fear of error, evaluation, failure, discovery of a problem, or another aversive outcome. Ordinary frustration after choice overload is not enough. When completion criteria are explicitly known and the barrier is fear of finding errors or discovering a problem, use anxiety_or_failure_avoidance without adding unclear_endpoint.
- state_load: ordinary sleep loss, fatigue, temporary anxiety, or task load reduces startup capacity.
- low_reward_or_priority: the user explicitly prefers another activity, devalues the task, or consciously assigns it lower priority. A voluntary priority choice is not a deficit and should not receive an intervention candidate.
- missing_social_trigger: the text explicitly supports a place, person, shared start, declaration, or external cue difference.
- compound: use only when at least two causally distinct barriers are separately supported as contributing to the same failed episode. Include each supported component candidate and also the compound candidate. Do not create compound for synonyms, downstream emotions, alternative explanations, or conditions inferred only from a comparison episode.
- insufficient_information, unknown, and outside_taxonomy remain valid outcomes and must not be forced into another category.

Question and intervention rules:
- Generate multiple candidates only when they represent genuinely distinct supported barriers or explicitly preserved alternatives.
- For a self-explanation conflict supported mainly by a comparison episode, preserve the contradiction, include the supported alternative candidates, ask exactly one focused question about the current failed task, and do not create intervention candidates yet.
- If the episode clearly supports a compound candidate, create at least one small intervention candidate targeting the compound candidate; it may change only one supported component at a time.
- For a voluntary low-priority choice, do not create an intervention candidate.
- For insufficient information, unknown, or outside-taxonomy cases, ask exactly one focused question and do not create an intervention candidate for that candidate.
- Otherwise, ask no question when the supplied text is already sufficient for the locked classification.
- Intervention entries are candidates only. Each must target a non-unknown hypothesis candidate and be small, observable, non-medical, and executable without professional supervision.

Safety and authority rules:
- Common temporary state factors such as ordinary sleep loss, fatigue, anxiety, or task load do not by themselves require human review and must not be treated as outside taxonomy.
- Require human review only for acute, severe, unexplained, or medically concerning physical symptoms, or for content genuinely outside the available taxonomy.
- Do not assign a formal rank, confidence score, truth probability, or selected intervention. The application resolver owns those decisions.
- Do not diagnose or advise medication.
- IDs need only be unique and internally consistent within this response.
- Return only the requested structured output.`;

type OpenAIResponseContent = {
  type?: string;
  text?: string;
  refusal?: string;
};

type OpenAIResponsePayload = {
  status?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: OpenAIResponseContent[];
  }>;
  error?: {
    message?: string;
  } | null;
};

export type OpenAIResponsesProviderOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  fetchImplementation?: typeof fetch;
};

function classifyHttpFailure(status: number, message: string): ProbeProviderError {
  if (status === 401 || status === 403) {
    return new ProbeProviderError("provider_auth_error", message, {
      retryable: false,
      statusCode: status
    });
  }
  if (status === 429) {
    return new ProbeProviderError("rate_limited", message, {
      retryable: true,
      statusCode: status
    });
  }
  if (status >= 500) {
    return new ProbeProviderError("provider_server_error", message, {
      retryable: true,
      statusCode: status
    });
  }
  return new ProbeProviderError("provider_rejected", message, {
    retryable: false,
    statusCode: status
  });
}

function extractOutputText(payload: OpenAIResponsePayload): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.length > 0) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") {
        throw new ProbeProviderError(
          "provider_refusal",
          content.refusal ?? "The provider refused the structured extraction request.",
          { retryable: false }
        );
      }
      if (content.type === "output_text" && typeof content.text === "string" && content.text.length > 0) {
        return content.text;
      }
    }
  }

  return null;
}

export class OpenAIResponsesExtractionProvider implements StructuredExtractionProvider {
  readonly providerName = "openai-responses";
  readonly apiRetrievalStorageRequested = false as const;
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: OpenAIResponsesProviderOptions) {
    if (options.apiKey.trim().length === 0) throw new Error("OpenAI API key is required.");
    if (options.model.trim().length === 0) throw new Error("OpenAI model is required.");

    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/u, "");
    this.timeoutMs = options.timeoutMs ?? 45_000;
    this.maxOutputTokens = options.maxOutputTokens ?? 4_000;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async extract(request: ProviderExtractionRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImplementation(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          store: false,
          max_output_tokens: this.maxOutputTokens,
          metadata: {
            probe_contract: "self-manual-v3",
            probe_attempt: String(request.attempt)
          },
          input: [
            {
              role: "system",
              content: selfManualExtractionSystemPrompt
            },
            {
              role: "user",
              content: `episode_id: ${request.episodeId}\n\nminimized_episode:\n${request.minimizedText}`
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "self_manual_v3_extraction",
              description: "Extraction-only evidence, hypothesis candidates, questions, interventions, and safety flags.",
              strict: true,
              schema: selfManualV3JsonSchema
            }
          }
        }),
        signal: controller.signal
      });

      let payload: OpenAIResponsePayload;
      try {
        payload = (await response.json()) as OpenAIResponsePayload;
      } catch (error) {
        throw new ProbeProviderError("malformed_json", "The provider returned a non-JSON HTTP response.", {
          retryable: response.status >= 500,
          statusCode: response.status,
          cause: error
        });
      }

      if (!response.ok) {
        throw classifyHttpFailure(
          response.status,
          payload.error?.message ?? `OpenAI Responses API returned HTTP ${response.status}.`
        );
      }

      if (payload.status && payload.status !== "completed") {
        throw new ProbeProviderError(
          "missing_output",
          `OpenAI response did not complete successfully (status=${payload.status}).`,
          { retryable: true }
        );
      }

      const outputText = extractOutputText(payload);
      if (outputText === null) {
        throw new ProbeProviderError("missing_output", "OpenAI response contained no output_text content.", {
          retryable: true
        });
      }

      try {
        return JSON.parse(outputText) as unknown;
      } catch (error) {
        throw new ProbeProviderError("malformed_json", "OpenAI output_text was not valid JSON.", {
          retryable: true,
          cause: error
        });
      }
    } catch (error) {
      if (error instanceof ProbeProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProbeProviderError("timeout", "OpenAI Responses API request timed out.", {
          retryable: true,
          cause: error
        });
      }
      throw new ProbeProviderError(
        "network_error",
        error instanceof Error ? error.message : "OpenAI Responses API network failure.",
        { retryable: true, cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}