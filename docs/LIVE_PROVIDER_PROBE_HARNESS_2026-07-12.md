# Live Provider Probe Harness — 2026-07-12

## Status

- Harness implementation: complete
- Offline harness tests: passed
- OpenAI Responses adapter: implemented
- Contract requested from the provider: `self-manual-v3`
- Local resolver after validation: `resolver-v1`
- Live production API execution: not yet run
- Long-term-memory writes from the probe: disabled
- `ManualEntry` writes from the probe: disabled
- User-facing integration: not connected

This record describes the runtime probe infrastructure and its offline validation. It does not claim that a live model call, repeated live-call stability, or real-user usefulness has been validated.

## Runtime boundary

The probe uses a provider-neutral `StructuredExtractionProvider` interface. A provider may return extraction candidates only. The application then:

1. validates the raw provider output with the strict `self-manual-v3` Zod contract
2. runs `resolver-v1` locally
3. records syntax and semantic checks separately
4. returns an in-memory probe result
5. performs no long-term-memory or `ManualEntry` write

The provider cannot directly set formal rank, formal validation stage, a selected intervention, or manual promotion state.

## Input minimization

Before transmission, the harness:

- trims and normalizes line endings
- redacts directly detectable e-mail addresses
- redacts HTTP and HTTPS URLs
- redacts common phone-number formats
- redacts numeric identifiers of 12 or more digits
- limits the transmitted text to 2,000 characters by default
- records only redaction counts, redaction kinds, character counts, and truncation status in the probe summary

The minimizer is a risk-reduction layer, not a complete anonymization guarantee. Names, locations, health details, and indirect identifiers can still remain unless the test input is intentionally minimized or anonymized before execution.

## Bounded recovery policy

The default runtime policy permits at most two attempts.

Retryable failure classes are:

- timeout
- network error
- rate limit
- provider server error
- missing output
- malformed JSON
- `self-manual-v3` schema-validation failure

Authentication failure, provider rejection, and provider refusal are not retried automatically. Retry count and failure class are recorded without logging the raw episode text or raw model output.

## OpenAI Responses adapter

`OpenAIResponsesExtractionProvider` uses the Responses API with:

- `store: false`
- strict JSON Schema structured output
- extraction-only `self-manual-v3` fields
- an explicit timeout
- bounded output tokens
- provider refusal detection
- HTTP error classification
- local JSON parsing followed by Zod validation in the harness

The requested JSON Schema excludes:

- formal `rank`
- formal `confidence`
- `recommendedIntervention` or another selected-intervention field
- duplicated `factEvidenceIds` and `selfExplanationEvidenceIds`
- direct `ManualEntry` promotion

## Repeated-call stability metrics

`runRepeatedProviderProbe` executes one locked input multiple times and calculates:

- successful-run count
- syntax-pass rate
- expected-code preservation
- primary-hypothesis agreement
- candidate-set agreement
- intervention-permission agreement
- human-review agreement
- primary-code distribution
- candidate-set distribution
- privacy-boundary status

The aggregate log intentionally omits the raw episode and raw provider output.

## Opt-in live probe

The live test is disabled during normal `npm test` and Vercel builds. It runs only when both `RUN_LIVE_AI_PROBE=1` and `OPENAI_API_KEY` are present.

Example:

```bash
RUN_LIVE_AI_PROBE=1 \
OPENAI_API_KEY='...' \
OPENAI_MODEL='gpt-5.6-luna' \
LIVE_PROBE_REPEAT_COUNT=3 \
LIVE_PROBE_CASE_LIMIT=12 \
npm run probe:live
```

The test uses the locked 12-case matrix, checks expected hypothesis-code preservation, and enforces the outside-taxonomy human-review/no-intervention path. The API key must be provided through a secret-management mechanism and must never be committed.

## Offline automated validation

Vercel Preview build for commit `10ac4ff137528764d2389fec085b58197b35396b` completed successfully.

- ordinary test files: 4 passed
- ordinary tests: 38 passed
- opt-in live test: 1 skipped because live credentials were not enabled
- TypeScript: passed
- Next.js production build: passed
- static generation: passed for `/`, `/_not-found`, and `/simple`
- `/simple`: HTTP 200 confirmed
- Vercel deployment state: `READY`

The new offline checks cover:

- direct-identifier redaction and input-length limiting
- validated extraction followed by local deterministic resolution
- no long-term-memory or `ManualEntry` write flags
- timeout retry and eventual success
- schema-invalid output retry and eventual success
- maximum-attempt enforcement
- repeated-call metric aggregation with a fake provider
- OpenAI request body uses `store: false` and strict structured output
- the provider JSON Schema excludes formal authority fields
- OpenAI rate-limit classification without API-key exposure

## What this proves

The current code can construct and test a provider-isolated live-probe path without connecting it to the user flow or persistence layers. It can minimize input, request extraction-only structured output, validate it, resolve it locally, classify failures, apply bounded retries, and calculate stability metrics.

## What remains unproven

- a real OpenAI Responses API call using the current prompt and schema
- strict-schema acceptance by the selected live model
- repeated live-call stability across the locked cases
- semantic quality on uncurated real-world descriptions
- model-version and prompt-version regression
- adequacy of the current direct-identifier minimizer for sensitive production data
- production secret management and consent UX
- user-facing integration
- long-term-memory integration
- real-life usefulness of the selected interventions

## Next gate

1. configure a restricted test API key through secret management without committing it
2. run a small live subset first, with no personal or health-identifying content
3. inspect syntax failure separately from semantic failure
4. confirm `store: false`, no memory write, and no `ManualEntry` write for every run
5. expand to the locked 12 cases at three repetitions each only after the small subset passes
6. review stability distributions and any safety failure
7. keep the pull request Draft until the live results are recorded and reviewed
