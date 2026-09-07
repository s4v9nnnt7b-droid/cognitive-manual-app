# Completion Plan / Core Completion Gate

## Current State

Status: **CORE_COMPLETE_CANDIDATE / v0.5.0**

The app core now implements the full operational loop required by the current SELF-THEORY architecture without modifying the locked Canonical Root Theory.

## Core completion matrix

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | Mobile/PWA public shell | COMPLETE |
| 1 | Theory Sync / Authority separation | COMPLETE |
| 2 | Assessment + Natural Episode Evidence | COMPLETE |
| 3 | Structured Evidence edit/delete | COMPLETE |
| 4 | Prediction Freeze / Decision Case | COMPLETE |
| 5 | Outcome / Feedback / Validation | COMPLETE |
| 6 | Calibration view | COMPLETE |
| 7 | Counterexample ledger | COMPLETE |
| 8 | Model Snapshot / history / diff | COMPLETE |
| 9 | State-Dynamics derived validation module | COMPLETE |
| 10 | Local backup export/import | COMPLETE |
| 11 | TypeScript / production build QA | COMPLETE |
| 12 | Public deployment verification | VERIFY_AFTER_MERGE |
| 13 | Physical iPhone/iPad QA | EXTERNAL HUMAN CHECK |

## Core completion definition

Core Complete means the app can:

1. preserve Evidence provenance,
2. keep Prediction separate from Outcome,
3. freeze prospective predictions before outcomes,
4. record MATCH / PARTIAL / MISS / NOT TESTABLE,
5. retain counterexamples instead of deleting them,
6. snapshot model state and compare changes,
7. run the derived State-Dynamics prediction/feedback loop,
8. edit/delete structured natural Evidence,
9. export/import local state,
10. preserve Canonical / Derived / Legacy authority boundaries.

## Not required for Core Complete

These are Input/Distribution extensions, not missing Core logic:

- OCR / screenshot ingestion
- self-check ingestion
- AI conversation/log ingestion
- cloud sync / account system
- payment
- native App Store packaging
- advanced Character OS / 3D

## Theory boundary

- Canonical Root Theory / S01 locked authority: unchanged.
- State-Dynamics: DERIVED / WORKING module only.
- Calibration score: operational metric, not proof of theory truth.
- NOT TESTABLE is a valid outcome.
- MISS and counterexamples are retained.

## Release judgment

After production build + public deployment verification, v0.5 may be marked **CORE_COMPLETE**.
Physical iPhone/iPad QA remains an external acceptance check and does not reopen the Core architecture unless it reveals a functional defect.
