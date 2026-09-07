# Theory Sync Gap Audit

Date: 2026-09-07
Status: IMPLEMENTATION BASELINE / THEORY-SYNC FOUNDATION

## Authority boundary

This app must not silently rewrite the frozen SELF-THEORY / S01 validation authority.

Implementation priority:

1. Locked validation authority / Canonical ADA
2. Theory Specification / Semantic Freeze
3. Derived domain models and application architecture
4. App presentation and UX

The app may operationalize canonical or derived concepts, but convenience must not be treated as proof that the theory is true.

## Current production baseline

The existing v0.2 app is a useful mobile/PWA shell, but its core inference is still primarily:

`assessment scores -> rule-based type -> report/manual/work suggestions`

That is now narrower than the current theory architecture.

## Gap matrix

| ID | Current v0.2 | Current theory/application model | Required change |
|---|---|---|---|
| G01 | Psychological assessment is the main structured input | Assessment is only one Evidence source | Add Evidence layer and source metadata |
| G02 | Output centers on a type label | Fixed personality labels are not the target | Treat current type as provisional legacy hypothesis |
| G03 | No domain adapter model | `x^(d) -> phi_d -> T_theta` | Add domain-aware Evidence/representation contracts |
| G04 | No explicit Common Engine boundary | E1-E6 define the Root Engine | Store theory/version manifest separately from app heuristics |
| G05 | Advice is generated directly from scores | Prediction, Utility/Preference, Decision must be separated | Add DecisionCase structure |
| G06 | Confidence/falsifiers are mostly prose caveats | Support/Ambiguous/Counterexample/Untested and boundary conditions are first-class | Add hypothesis status/confidence/boundaries |
| G07 | Change log is one free-form string | Natural episodes should be reusable Evidence | Migrate toward structured episode records |
| G08 | No formal Outcome/Feedback loop | `Act -> Outcome -> Feedback -> Update` is central | Add outcome, feedback, validation fields |
| G09 | No model version or authority metadata | Canonical / Derived / Legacy must not be conflated | Add theorySpecVersion/appModelVersion/authority |
| G10 | No prediction calibration state | State-Dynamics is a derived prediction/calibration candidate | Preserve prediction and later outcome separately |
| G11 | OCR is presented as the next product feature | OCR is an input Adapter, not the product core | Move OCR behind Evidence ingestion contract |
| G12 | Character OS occupies conceptual center | Character OS is presentation/view layer | Keep it optional and downstream of model state |
| G13 | v0.2 LocalStorage schema has no migration contract | Model is becoming longitudinal | Add versioned storage and migration before richer data |
| G14 | No explicit Evidence provenance | Naturalistic/self-report/assessment/import differ epistemically | Store source and confidence for every Evidence item |
| G15 | No NOT TESTABLE state | Fail-closed is required when evidence is insufficient | Support `not-testable` validation output |
| G16 | No counterevidence collection path | Refutation and prediction error are required | Preserve counterEvidenceIds and MISS/PARTIAL outcomes |
| G17 | Suggestions are not auditable decisions | Decision Infrastructure requires process auditability | Store goal, constraints, uncertainty, decision and outcome |
| G18 | Personal data deletion is all-or-nothing | Longitudinal evidence needs granular future controls | Keep total delete now; design granular controls later |

## Theory references to operationalize

### Canonical Root Theory (E1-E6)

- E1 Common Cognitive Engine
- E2 Discrepancy Detection
- E3 Latent Structure Inference
- E4 Adaptive Action Selection
- E5 Model Update
- E6 Generalization / Externalization

The app should not claim that these equations are empirically established.

### Yuichiro-specific / derived application candidates

- Bottleneck-adjusted effective performance
- Quality / uncertainty CLOSE
- Value-of-information CLOSE
- State-Dynamics and prediction-error calibration
- Root-to-Domain Generator

These remain derived/working layers unless separately promoted through their own validation/version process.

## Migration principle

Do not discard v0.2. Reuse it as the mobile UI/PWA shell.

Migration sequence:

1. Add versioned Theory/Evidence domain model.
2. Convert existing assessment data into one Evidence item.
3. Re-label current rule-based type as a provisional legacy hypothesis.
4. Replace free-form-only change log with structured Natural Episode capture while retaining backward compatibility.
5. Add DecisionCase records for Prediction -> Utility -> Decision -> Outcome -> Feedback.
6. Only after the core data loop exists, add OCR/self-check/chat imports as Evidence Adapters.
7. Add calibration, counterexample, support-status and model-history views.
8. Keep Character OS as an optional visualization layer.

## Definition of Theory Sync v0.3 foundation complete

- Existing v0.2 data still loads.
- Assessment values can be represented as Evidence instead of identity.
- UI clearly states that type output is provisional/legacy, not a fixed diagnosis/personality truth.
- App stores model/version metadata.
- App can store at least one structured Natural Episode.
- App has a data contract for DecisionCase/Outcome/Feedback even if full decision UI is staged.
- No canonical equation or frozen theory definition is changed by the app.
