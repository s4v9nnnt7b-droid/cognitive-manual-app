# AI Contract Probe — 2026-07-12

## Status

- Phase: limited contract validation
- Model used to prepare recorded outputs: GPT-5.6 Thinking
- Mode: offline recorded contract probe
- Production model API connected: no
- Long-term memory writes: disabled
- ManualEntry automatic promotion: disabled
- User-facing reasoning flow connected: no

This document records a contract-fit probe. It does not claim that a production model call, repeated-call stability, or real-user effectiveness has been validated.

## Inputs

The locked 12-case matrix contains:

- six designed boundary cases
- three realistic task-start cases
- three paraphrases of the same choice-overload pattern

It covers clear causes, compound causes, insufficient information, conflict between self-explanation and observed facts, low priority, outside-taxonomy physical symptoms, environment-dependent initiation, anxiety, and paraphrase robustness.

## Contract v1 gaps found before the probe

The first contract used plain `facts` and `selfExplanation` string arrays while hypotheses referred to evidence IDs. That structure could not prove that support and counterevidence references were grounded in extracted evidence.

The following gaps were corrected before accepting probe results:

1. extracted evidence had no stable IDs
2. hypothesis rank was implicit
3. fact and self-explanation reference types were not validated
4. state-factor references were not type-checked
5. dangling evidence references were possible
6. an unknown or insufficient-information hypothesis could receive an intervention
7. the contract allowed up to three questions although the MVP requires one question at a time
8. outside-taxonomy outputs did not require human review
9. human-review reasons were not internally consistent
10. contradictions were unstructured text rather than evidence-linked records

## Contract v2 changes

`self-manual-v2` adds:

- evidence objects with unique IDs
- evidence kind, source, and verification status
- `factEvidenceIds` and `selfExplanationEvidenceIds`
- explicit and unique hypothesis ranks
- grounded support, counterevidence, and state-factor references
- structured unresolved contradictions
- intervention targeting by hypothesis ID
- one-question maximum
- intervention prohibition for primary unknown paths
- human review requirement for outside-taxonomy cases
- review-reason consistency checks

## Recorded probe results

All results below are enforced by automated tests rather than inspection alone.

- 12 of 12 locked cases have one recorded output
- 12 of 12 outputs pass the `self-manual-v2` Zod contract
- all locked expected hypothesis codes are present
- all locked semantic preservation phrases are present
- all three paraphrase variants keep `choice_overload` as the leading hypothesis
- diagnosis output remains disabled in every case
- medication advice remains disabled in every case
- outside-taxonomy physical symptoms require human review and receive no intervention
- unknown and insufficient-information paths cannot receive an intervention
- dangling evidence references are rejected
- human review without a reason is rejected

## Automated validation

Vercel Preview build for commit `63bae50570967098c155f2b9ad0435c10023d02d` completed successfully.

- test files: 2 passed
- tests: 21 passed
- TypeScript: passed
- Next.js production build: passed
- static generation: passed
- `/simple`: HTTP 200

Dependency reproducibility was also restored:

- `package-lock.json` was generated and committed
- TypeScript was pinned to `5.9.3`
- `tsconfig.json` target was raised from `es5` to `es2017`

The TypeScript pin was required because `typescript: latest` resolved to TypeScript 7.0.2, which the current Next.js build did not accept as the required TypeScript package.

## What this proves

The current structured contract can represent the locked 12 cases without losing the required distinctions, and its reference and safety invariants are executable.

The deterministic engine and recorded AI outputs can be checked together in every build.

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

1. accepts one free-text episode
2. sends only the minimum required text to a configured model provider
3. requests `self-manual-v2` structured output
4. validates the response with Zod
5. records syntax failure separately from semantic failure
6. retries only under an explicit bounded policy
7. never writes probe output to long-term memory or ManualEntry

The Draft PR must remain Draft until a live limited probe or equivalent provider-runtime validation has been completed and reviewed.
