# v0.6.2 Error Attribution & Pilot Metrics

Status: DERIVED VALIDATION EXTENSION / v0.5 CORE CLOSED

## Purpose

v0.6.2 adds prospective process metrics and post-outcome error attribution to Decision Cases.
The goal is not to make the Theory look more accurate. The goal is to learn whether the Decision Infrastructure improves real decisions and, when it fails, where the failure may have come from.

## Error decomposition reference

```text
Error = E_phi + E_T + E_P + E_U + E_delta + E_environment
```

Operational categories:

- `representation`: Evidence -> Domain representation / E_phi
- `common-engine`: common structure/model hypothesis / E_T
- `prediction`: outcome prediction / E_P
- `utility`: Goal / Preference / Utility / E_U
- `decision-policy`: mapping prediction + utility -> action / E_delta
- `environment`: exogenous or unobserved environmental change
- `insufficient-evidence`: Evidence was not sufficient for the claim
- `mixed`: multiple causes plausibly contributed
- `unknown`: attribution is not justified yet

## Pilot metrics

Freeze-time metrics:

- decision method: `kernel-assisted` / `intuitive` / `pros-cons` / `other`
- decision time in minutes
- cognitive load, operational 1-5
- information gathering cost, operational 1-5

Post-outcome metrics:

- outcome regret, operational 1-5
- process regret, operational 1-5
- process quality, operational 1-5
- reversal needed: yes / no / unrecorded

These 1-5 values are not validated psychometric scales. They are within-person operational measures for repeated comparison.

## Fail-closed attribution rules

- MATCH does not require an error category.
- PARTIAL / MISS with no justified category defaults to `unknown`.
- NOT TESTABLE with no explicit category defaults to `insufficient-evidence`.
- Multiple categories are allowed.
- `mixed` and `unknown` are normal outcomes, not data-quality failures.
- Attribution notes must not be used to rewrite the frozen Prediction after seeing Outcome.

## Pilot stages

Batch 1 is the first 5 completed Kernel-linked Decision Cases.
It is a plumbing and operational check, not statistical confirmation of the Root Theory.

After enough observations, candidate comparisons are:

- Kernel-assisted decisions
- ordinary intuitive decisions
- ordinary pros / cons decisions

Candidate outcome/process measures include Prediction Validation, Decision Time, Cognitive Load, Information Cost, Outcome Regret, Process Regret, Reversal Rate and Process Quality.

## Authority boundary

- Canonical Root Theory / S01 authority is unchanged.
- v0.5 Core validation semantics stay closed.
- Pilot Metrics and Error Attribution are DERIVED application instrumentation.
- Application usefulness cannot establish Theory truth.
- Counterexamples, NOT TESTABLE, MIXED and UNKNOWN remain first-class data.
