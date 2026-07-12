# AI Contract Probe — 2026-07-12

## Status

- Phase: provider-isolated runtime-harness validation
- Model used to prepare recorded outputs: GPT-5.6 Thinking
- Recorded-output mode: offline contract probe
- Current extraction contract: `self-manual-v3`
- Current resolver: `resolver-v1`
- Provider-isolated runtime harness: implemented and offline-tested
- OpenAI Responses adapter: implemented and offline-tested
- Production model API executed: no
- Long-term-memory writes: disabled
- `ManualEntry` automatic promotion: disabled
- User-facing reasoning flow connected: no

This document records contract fit, deterministic resolution, and offline runtime-harness validation. It does not claim that a live production model call, repeated live-call stability, or real-user effectiveness has been validated.

Detailed runtime-harness record: `docs/LIVE_PROVIDER_PROBE_HARNESS_2026-07-12.md`.

## Inputs

The locked 12-case matrix contains:

- six designed boundary cases
- three realistic task-start cases
- three paraphrases of the same choice-overload pattern

It covers clear causes, compound causes, insufficient information, conflict between self-explanation and observed facts, low priority, outside-taxonomy physical symptoms, environment-dependent initiation, anxiety, and paraphrase robustness.

## Legacy v2 probe

The original recorded fixtures use `self-manual-v2`. That contract added grounded evidence IDs and safety invariants, but it also allowed the model output to contain:

- formal hypothesis `rank`
- formal `confidence`
- `recommendedIntervention`
- duplicated `factEvidenceIds` and `selfExplanationEvidenceIds`

Those fields created an authority-boundary problem: the model could appear to decide the formal ranking, validation stage, and selected intervention.

The v2 fixtures are retained only as locked historical migration inputs. They are not the current provider contract.

## Contract v3: extraction only

`self-manual-v3` separates model extraction from formal application state.

`AIExtractionResult` contains:

- canonical evidence objects with ID, kind, source, and verification status
- hypothesis candidates with support, counterevidence, state factors, unknowns, and rationale
- evidence-linked contradictions
- at most one additional question
- intervention candidates rather than a selected intervention
- safety and human-review flags

The v3 extraction contract intentionally excludes:

- formal rank
- formal confidence or truth probability
- selected intervention
- duplicated fact and self-explanation index arrays
- direct `ManualEntry` promotion

Required evidence views are derived from the canonical evidence objects.

## Deterministic resolution

`resolver-v1` converts a validated `AIExtractionResult` into `ResolvedAnalysis`.

The resolver owns:

- formal hypothesis ordering
- evidence-based confidence stage
- intervention permission
- formal intervention selection
- human-review blocking
- audit reasons and rule version

Intervention selection checks the formally resolved primary hypothesis, safety blocks, prior attempted interventions, and prior intervention or hypothesis mismatch. Model candidates cannot directly become `HypothesisState`, `InterventionTrial`, or `ManualEntry`.

The confidence stage represents evidence sufficiency and validation maturity, not the probability that a hypothesis is objectively true.

## Recorded probe migration

The locked v2 outputs are migrated to v3 by removing model-authored rank and confidence, converting the old selected intervention into an intervention candidate, and dropping duplicated evidence-index arrays.

Automated checks confirm:

- 12 of 12 locked cases migrate to `self-manual-v3`
- 12 of 12 migrated outputs pass the v3 Zod contract
- all locked expected hypothesis codes remain present
- all locked semantic-preservation phrases remain present
- all three paraphrase variants formally resolve to `choice_overload`
- diagnosis output remains disabled in every case
- medication advice remains disabled in every case
- outside-taxonomy physical symptoms require human review and receive no selected intervention
- unknown and insufficient-information candidates cannot receive intervention candidates
- dangling evidence references are rejected
- human review without a reason is rejected
- model-authored formal rank, confidence, and selected-intervention fields are rejected

## Resolver regression checks

Automated tests also confirm:

- formal rank is derived from evidence rather than candidate order
- evidence-based stages are categorical and auditable
- tied leading hypotheses block intervention selection
- prior intervention mismatch prevents reselection of the rejected intervention
- an untried eligible intervention is preferred
- only resolved output is materialized into formal hypothesis state
- evidence views are derived instead of duplicated
- every formal resolution records `resolver-v1` and audit reasons

## Provider-isolated runtime harness

The runtime harness now:

1. minimizes and redacts directly detectable identifiers from one free-text episode
2. caps the transmitted text length
3. calls a provider through a provider-neutral extraction interface
4. validates provider output with `self-manual-v3`
5. runs `resolver-v1` locally after successful validation
6. records syntax checks separately from expected-code semantic checks
7. classifies timeout, network, rate-limit, provider, JSON, and schema failures
8. retries only under a bounded policy
9. records no long-term-memory or `ManualEntry` write
10. repeats one input and calculates stability metrics

The OpenAI Responses adapter requests strict JSON Schema output and sets `store: false`. Its provider schema excludes formal rank, formal confidence, a selected intervention, duplicated evidence-index arrays, and direct manual promotion.

The live provider test is opt-in and skipped during ordinary builds unless both `RUN_LIVE_AI_PROBE=1` and `OPENAI_API_KEY` are present. Aggregate live-test logs are designed to omit raw episode text and raw model output.

## Automated validation

Vercel Preview build for commit `10ac4ff137528764d2389fec085b58197b35396b` completed successfully.

- ordinary test files: 4 passed
- ordinary tests: 38 passed
- opt-in live provider test: 1 skipped because live credentials were not enabled
- recorded-output migration: 12 of 12 passed
- TypeScript: passed
- Next.js production build: passed
- static generation: passed for `/`, `/_not-found`, and `/simple`
- `/simple`: HTTP 200 confirmed
- Vercel deployment state: `READY`

Dependency reproducibility remains locked:

- `package-lock.json` is committed
- TypeScript is pinned to `5.9.3`
- `tsconfig.json` target is `es2017`

## What this proves

The current code can:

- represent all locked cases in an extraction-only AI contract
- reject authority leakage from model output
- compute formal ordering and intervention selection through a versioned deterministic resolver
- preserve evidence references, contradictions, unknown paths, and human-review blocks
- keep existing correction, state-transition, and `ManualEntry` promotion safeguards passing
- construct a provider-isolated runtime path with input minimization, strict structured output, local resolution, bounded recovery, and stability metrics
- keep the runtime probe disconnected from user-facing persistence and long-term-memory paths

## What remains unproven

- a live production model structured-output call using the current prompt and schema
- repeated live-call consistency for the same input
- model and prompt change regression
- automatic parsing of uncurated real-world text
- semantic accuracy beyond locked expected hypothesis-code checks
- adequacy of the direct-identifier minimizer for sensitive production data
- production secret management and consent UX
- user-facing integration
- long-term-memory integration
- real-life usefulness of the proposed interventions

## Next gate

1. configure a restricted test API key through secret management without committing it
2. run a small, non-sensitive live subset first
3. verify strict-schema acceptance and local `resolver-v1` execution
4. inspect syntax failure separately from semantic failure
5. verify the bounded retry record and zero long-term-memory/`ManualEntry` writes
6. expand to the locked 12 cases at three repetitions each only after the subset passes
7. review stability distributions and all safety-sensitive cases
8. keep the pull request Draft until the live results are recorded and reviewed
