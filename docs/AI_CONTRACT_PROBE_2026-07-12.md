# AI Contract Probe — 2026-07-12

## Status

- Phase: two-stage contract and deterministic resolver validation
- Model used to prepare recorded outputs: GPT-5.6 Thinking
- Mode: offline recorded contract probe
- Current extraction contract: `self-manual-v3`
- Current resolver: `resolver-v1`
- Production model API connected: no
- Long-term memory writes: disabled
- ManualEntry automatic promotion: disabled
- User-facing reasoning flow connected: no

This document records contract-fit and deterministic-resolution checks. It does not claim that a production model call, repeated-call stability, or real-user effectiveness has been validated.

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

The v2 fixtures are retained only as locked historical inputs for migration. They are not the current production contract.

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
- direct ManualEntry promotion

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
- all locked semantic preservation phrases remain present
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

## Automated validation

Vercel Preview build for commit `d04401df1e7d2e1db2129a3ea168a5e40197b392` completed successfully.

- test files: 3 passed
- tests: 30 passed
- TypeScript: passed
- Next.js production build: passed
- static generation: passed
- `/simple`: available as a static route

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
- keep existing correction, state-transition, and ManualEntry promotion safeguards passing

## What remains unproven

- live production model structured-output calls
- repeated-call consistency for the same input
- model and prompt change regression
- automatic parsing of uncurated real-world text
- runtime retry and invalid-output recovery
- privacy controls for transmitted data
- user-facing integration
- long-term memory integration
- real-life usefulness of the proposed interventions

## Next gate

The next implementation step is a provider-isolated runtime probe harness that:

1. accepts one minimized free-text episode
2. requests `self-manual-v3` extraction output only
3. validates the response with Zod
4. runs `resolver-v1` locally after validation
5. records syntax failure separately from semantic failure
6. retries only under an explicit bounded policy
7. never writes probe output to long-term memory or ManualEntry
8. repeats locked inputs to measure output stability

The Draft PR must remain Draft until the live limited probe or equivalent provider-runtime validation is completed and reviewed.
