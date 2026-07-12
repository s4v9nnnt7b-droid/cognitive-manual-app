# Live Provider Probe Harness — 2026-07-12

## Status

- Harness implementation: complete
- Offline harness and guard tests: passed
- OpenAI Responses adapter: implemented
- Contract requested from the provider: `self-manual-v3`
- Local resolver after validation: `resolver-v1`
- Restricted three-case live smoke: passed
- Full 12-case live probe: attempted, remediation pending rerun
- Long-term-memory writes from the probe: disabled
- `ManualEntry` writes from the probe: disabled
- User-facing integration: not connected

This record describes the provider-isolated runtime path and its current validation state. It does not claim that the full 12-case matrix, uncurated real-world input, complete anonymization, or real-user usefulness has passed.

## Runtime boundary

The probe uses a provider-neutral `StructuredExtractionProvider` interface. A provider may return extraction candidates only. The application then:

1. validates raw output with the strict `self-manual-v3` contract
2. applies request-correlation and evidence-source verification guards
3. runs `resolver-v1` locally
4. records syntax and semantic checks separately
5. returns an in-memory probe result
6. performs no long-term-memory or `ManualEntry` write

The provider cannot directly set formal rank, formal validation stage, a selected intervention, or manual promotion state.

## Privacy and input minimization

Before transmission, the harness:

- trims and normalizes line endings
- redacts directly detectable e-mail addresses
- redacts HTTP and HTTPS URLs
- redacts common phone-number formats
- redacts numeric identifiers of 12 or more digits
- limits transmitted text to 2,000 characters by default
- records only redaction counts, redaction kinds, character counts, truncation status, hypothesis codes, permission booleans, and classified failures

Aggregate logs omit raw episode text, evidence statements, raw provider output, and credentials. The minimizer reduces direct identifiers but is not a complete anonymization guarantee.

## Live-provider guard

`withLiveProviderGuards` rejects provider output when:

- the returned `episodeId` does not match the requested episode
- `current_user_text` is labeled as anything stronger than `user_reported`
- `behavior_log` is labeled as anything other than `observed` or `verified`
- `formal_test` is labeled as anything other than `verified`

Guard errors contain metadata paths and rule codes only.

## Bounded recovery and quota handling

The default runtime policy permits at most two attempts for retryable failures.

Temporary timeouts, network errors, ordinary rate limits, provider server errors, missing output, malformed JSON, and schema failures may be retried under the bounded policy.

Quota or billing exhaustion is separated from ordinary rate limiting and stops after one attempt. Authentication failure, provider rejection, and provider refusal are also not retried automatically.

## OpenAI Responses adapter

`OpenAIResponsesExtractionProvider` uses:

- `store: false`
- strict JSON Schema structured output
- extraction-only `self-manual-v3` fields
- an explicit timeout
- bounded output tokens
- provider refusal detection
- HTTP error classification
- local JSON parsing followed by Zod and live-guard validation

The provider schema excludes formal rank, formal confidence, a selected intervention, duplicated evidence views, and direct `ManualEntry` promotion.

## Restricted live smoke result

Live model: `gpt-5.6-terra`.

Three locked synthetic cases were run three times each, for nine live calls total.

| Case | Successful runs | Expected code present | Primary agreement | Candidate-set agreement | Intervention agreement | Human-review agreement |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| outside taxonomy | 3/3 | yes | 1.0 | 1.0 | 1.0 | 1.0 |
| insufficient information | 3/3 | yes | 1.0 | 1.0 | 1.0 | 1.0 |
| unclear first action | 3/3 | yes | 1.0 | 0.6667 | 1.0 | 1.0 |

All nine calls passed the strict contract and live guards. Outside-taxonomy always required human review and selected no intervention. Insufficient-information always selected no intervention and returned one additional question. Privacy-boundary flags held for every run.

## First full-matrix attempt

The first 12-case-by-three-repetition run stopped on the fourth prioritized case, `boundary-compound`, because the test previously used immediate assertions inside the case loop.

Observed compound-case metrics:

- successful provider calls: 3/3
- syntax failures: none
- primary codes: `compound` twice and `state_load` once
- expected-code preservation: failed in at least one run
- primary-hypothesis agreement: 0.6667
- candidate-set agreement: 0.6667
- intervention-permission agreement: 0.6667
- human-review agreement: 0.6667
- privacy boundaries: held in every run

This was a semantic and stability failure, not an API, JSON, privacy, or persistence failure.

## Remediation after the compound failure

The prompt now states that:

- when two or more distinct in-taxonomy causes are directly supported, each supported component candidate and a `compound` candidate must be emitted
- ordinary sleep loss, fatigue, anxiety, and task load belong to state-factor analysis and do not by themselves require human review
- human review is reserved for acute, severe, unexplained, or medically concerning physical symptoms, or content genuinely outside the taxonomy

The live test now uses soft assertions so a full matrix run gathers every case before reporting failure. Safe per-run diagnostics now include primary code, candidate-code set, missing expected codes, intervention permission, selected-intervention presence, human-review state, and additional-question presence. Raw input and model prose remain omitted.

## Current automated validation

Validated Vercel Preview commit: `b7ec007bd2ecc9cd52c195f722f94ae97edb53a7`.

- ordinary test files: 7 passed
- ordinary tests: 46 passed
- opt-in live-provider test: 1 skipped during the ordinary build
- TypeScript: passed
- Next.js production build: passed
- static generation: passed for `/`, `/_not-found`, and `/simple`
- Vercel deployment state: `READY`

## Current boundary and next gate

The next gate is a rerun of the full 12-case matrix at three repetitions each using the remediated prompt and full-collection diagnostics.

The pull request remains Draft and unmerged. The reasoning path remains isolated from the user-facing flow. Long-term memory and automatic `ManualEntry` promotion remain disabled.
