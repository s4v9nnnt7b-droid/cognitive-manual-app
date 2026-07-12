# Live Provider Probe Harness — 2026-07-12

## Status

- Harness implementation: complete
- Offline harness and guard tests: passed
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
2. applies live-provider correlation and source-verification guards
3. runs `resolver-v1` locally
4. records syntax and semantic checks separately
5. returns an in-memory probe result
6. performs no long-term-memory or `ManualEntry` write

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

The minimizer is a risk-reduction layer, not a complete anonymization guarantee. Names, locations, health details, and indirect identifiers can still remain unless the test input is intentionally minimized or anonymized before execution. The first live run therefore uses only the locked synthetic cases.

## Live-provider guard

`withLiveProviderGuards` is applied before formal resolution. It rejects provider output when:

- the returned `episodeId` does not match the requested episode
- `current_user_text` is labeled as anything stronger than `user_reported`
- `behavior_log` is labeled as anything other than `observed` or `verified`
- `formal_test` is labeled as anything other than `verified`

The guard reports metadata paths and rule codes only. It does not place raw evidence statements in guard errors.

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
- live-provider guard failure classified as schema validation

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
- local JSON parsing followed by Zod and live-guard validation

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

## Live gate behavior

The live test is disabled during normal `npm test` and Vercel builds. When `RUN_LIVE_AI_PROBE=1` is set, both `OPENAI_API_KEY` and `OPENAI_MODEL` are mandatory; the test fails rather than silently skipping when either value is absent.

The default restricted run uses:

- three locked synthetic cases
- three repetitions per case
- outside-taxonomy, insufficient-information, and clear-first-action cases prioritized in the smoke subset
- minimum primary-hypothesis agreement of two thirds
- minimum candidate-set agreement of two thirds
- unanimous intervention-permission agreement
- unanimous human-review agreement

The outside-taxonomy case must require human review and must not select an intervention. The insufficient-information case must not select an intervention and must return one additional question.

The run command is:

```bash
RUN_LIVE_AI_PROBE=1 \
OPENAI_MODEL='<current-supported-model-id>' \
LIVE_PROBE_REPEAT_COUNT=3 \
LIVE_PROBE_CASE_LIMIT=3 \
LIVE_PROBE_MIN_AGREEMENT=0.6666666667 \
npm run probe:live
```

`OPENAI_API_KEY` must be injected through a secret-management mechanism and must never be committed or placed in logs.

## Offline automated validation

Vercel Preview build for commit `f706f09654d19890945c615926783e1bd3aebb68` completed successfully.

- ordinary test files: 5 passed
- ordinary tests: 42 passed
- opt-in live test: 1 skipped because live execution was not enabled
- TypeScript: passed
- Next.js production build: passed
- static generation: passed for `/`, `/_not-found`, and `/simple`
- Vercel deployment state: `READY`

The offline checks cover:

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
- request/response episode correlation
- prevention of verification inflation from current user text
- rejection of invalid behavior-log verification states
- live activation cannot pass by silently skipping a missing key or model
- smoke-case safety and stability thresholds are explicit

## What this proves

The current code can construct and test a provider-isolated live-probe path without connecting it to the user flow or persistence layers. It can minimize input, request extraction-only structured output, apply strict correlation and evidence-source guards, validate it, resolve it locally, classify failures, apply bounded retries, and calculate stability metrics.

## What remains unproven

- a real OpenAI Responses API call using the current prompt and schema
- availability and strict-schema acceptance of the selected live model ID
- repeated live-call stability across the locked cases
- semantic quality on uncurated real-world descriptions
- model-version and prompt-version regression
- adequacy of the current direct-identifier minimizer for sensitive production data
- production secret management and consent UX
- user-facing integration
- long-term-memory integration
- real-life usefulness of the selected interventions

## Next gate

1. create or select a restricted test API key through secure setup
2. inject the key without committing or logging it
3. choose a currently supported structured-output model ID
4. run the three-case synthetic smoke probe
5. inspect syntax failure separately from semantic failure
6. confirm request correlation, evidence-verification guards, `store: false`, no memory write, and no `ManualEntry` write
7. expand to all 12 locked cases at three repetitions each only after the smoke subset passes
8. review stability distributions and any safety failure
9. keep the pull request Draft until the live results are recorded and reviewed
