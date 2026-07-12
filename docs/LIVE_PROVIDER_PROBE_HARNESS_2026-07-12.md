# Live Provider Probe Harness — 2026-07-12

## Status

- Harness implementation: complete
- Offline harness and guard tests: passed
- OpenAI Responses adapter: implemented
- Contract requested from the provider: `self-manual-v3`
- Local resolver after validation: `resolver-v1`
- Restricted three-case live smoke: passed
- Targeted compound-case remediation check: passed, 5/5
- First complete 12-case live matrix: executed, semantic remediation still in progress
- Long-term-memory writes from the probe: disabled
- `ManualEntry` writes from the probe: disabled
- User-facing integration: not connected

This record describes the provider-isolated runtime boundary, live results, and current remediation state. It does not claim that uncurated real-world input, production anonymization, user-facing integration, or actual user benefit has been validated.

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

The minimizer is a risk-reduction layer, not a complete anonymization guarantee. Names, locations, health details, and indirect identifiers can still remain unless the input is intentionally minimized or anonymized before execution.

## Live-provider guard

`withLiveProviderGuards` is applied before formal resolution. It rejects provider output when:

- the returned `episodeId` does not match the requested episode
- `current_user_text` is labeled as anything stronger than `user_reported`
- `behavior_log` is labeled as anything other than `observed` or `verified`
- `formal_test` is labeled as anything other than `verified`

The guard reports metadata paths and rule codes only. It does not place raw evidence statements in guard errors.

## Bounded recovery policy

The default runtime policy permits at most two attempts. Temporary timeout, network, rate-limit, provider-server, missing-output, malformed-JSON, schema-validation, and live-guard failures may be retried within the explicit cap. Authentication failure, provider rejection, provider refusal, and quota exhaustion are not retried automatically.

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

The requested JSON Schema excludes formal `rank`, formal `confidence`, selected intervention fields, duplicated evidence views, and direct `ManualEntry` promotion.

## Restricted live smoke result

Live model: `gpt-5.6-terra`.

Three locked synthetic cases were run three times each. All nine calls passed syntax, expected-code, safety-route, and privacy-boundary checks.

- outside taxonomy: 3/3 stable, human review required, no intervention
- insufficient information: 3/3 stable, one question, no intervention
- first-action case: expected code present in 3/3, but the original candidate-set agreement was only two thirds

## Compound remediation

The first full-matrix attempt exposed instability in `boundary-compound`. The prompt was revised so that ordinary sleep loss and fatigue remain state-load evidence, clearly mixed in-taxonomy episodes emit each supported component plus `compound`, and human review is reserved for medically concerning symptoms or genuinely outside-taxonomy content.

The remediated compound case was then run five times:

- successful runs: 5/5
- primary code: `compound` in 5/5
- candidate set: `choice_overload | compound | state_load` in 5/5
- primary, candidate-set, intervention, and human-review agreement: 1.0
- privacy boundaries: held in 5/5

## Complete 12-case matrix findings

The remediated 12-case matrix was executed three times per case, 36 live calls total. Every provider response was syntactically valid and every privacy-boundary flag held. Stable cases included outside taxonomy, insufficient information, compound state-plus-choice load, low priority, social trigger, anxiety, and the short and long choice-overload paraphrases.

The run exposed three explicit failures and two additional semantic weaknesses:

1. `boundary-self-explanation-conflict`
   - expected `unclear_first_action` and `unclear_endpoint` were not both retained in every run
   - candidate-set agreement was one third
   - intervention permission varied
   - self-blame was once misread as low priority
2. `realistic-study-start`
   - `preparation_load` was omitted in every run
   - the original input did not explicitly describe preparation steps strongly enough
   - intervention permission varied
3. `paraphrase-emotional`
   - downstream frustration was sometimes promoted to anxiety or first-action ambiguity
   - `compound` was over-produced
   - intervention permission varied
4. `boundary-clear-first-action`
   - the expected first-action code was present, but `compound` became the formal primary in all three runs
   - the old expected-code-only check did not detect this semantic regression
5. `boundary-low-priority`
   - the classification was stable, but the model proposed an intervention for an explicit voluntary priority choice

## Current remediation

The locked semantic contract now specifies, per case:

- allowed primary code or codes
- exact candidate-code set
- expected intervention permission
- expected human-review state
- expected additional-question state

The prompt now distinguishes:

- first-action ambiguity from broad choice overload
- preparation work from merely seeing several materials
- explicit failure anxiety from downstream frustration
- voluntary low priority from deficit
- concurrent causes from alternative explanations or emotional consequences
- self-blame from evidence

Comparison-based self-explanation conflicts must preserve the contradiction, ask one focused question, and avoid premature intervention. The realistic study case now explicitly includes material selection, desk clearing, and page-finding setup work.

## Automated validation

Validated Vercel Preview commit: `1b2d1e26484c956865ca60a78a21f9d23888c45a`.

- ordinary test files: 8 passed
- ordinary tests: 52 passed
- opt-in live test: 1 skipped during the ordinary build
- TypeScript: passed
- Next.js production build: passed
- static generation: passed for `/`, `/_not-found`, and `/simple`
- Vercel deployment state: `READY`

## Current boundary

- The strict semantic remediation is ordinarily validated but has not yet been rerun live.
- The next step is a targeted live run for the five affected cases before another complete 12-case matrix.
- Uncurated real-world descriptions, complete anonymization, production consent and secret handling, UI integration, persistence integration, and actual user benefit remain unproven.
- Long-term memory and automatic `ManualEntry` promotion remain disabled.
- The pull request remains Draft and unmerged.