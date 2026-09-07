# Mobile QA Checklist — v0.5 Core Complete

## Automated / build acceptance

- [x] TypeScript strict typecheck passes
- [x] Next.js production build passes
- [x] Static `/` route is generated
- [x] No repository personal data added
- [x] v0.4 LocalStorage state is normalized into schema v2
- [x] Prediction is stored separately before Outcome
- [x] MISS / NOT TESTABLE are preserved as valid states
- [x] Model Snapshot and State-Dynamics are Derived/application data only

## Functional flow to verify in browser

1. Consent -> Home
2. Add anonymous Assessment -> Model
3. Add Natural Episode -> edit -> save -> delete
4. Create Decision Case -> Prediction Freeze
5. Reopen frozen Case -> add Outcome / Feedback -> Validation
6. Open 検証 -> Calibration / Counterexample
7. Save two Model Snapshots -> delta is shown
8. Freeze State-Dynamics -> add Outcome -> Validation
9. Export backup JSON -> import same JSON
10. Reload page -> state persists
11. Delete all -> all local state is cleared

## Physical iPhone / iPad acceptance

This remains an external-device check because a build server cannot reproduce the user's physical Safari/PWA environment exactly.

- no horizontal overflow
- safe-area/header/bottom-nav remain tappable
- form keyboard does not hide critical controls
- PWA launch works after Home Screen install
- long Evidence / Feedback text wraps without layout break

A physical-device UI defect should reopen UI acceptance only; it does not reopen the Theory/Core architecture unless it reveals data loss or a broken validation flow.
