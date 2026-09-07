# 自分取扱説明書 v0.5 Core Complete

公開URL：`https://cognitive-manual-app.vercel.app/`

「固定タイプを当てるアプリ」ではなく、Evidence・Prediction・Decision・Outcome・Feedback・Model Updateを分離して、自分についての条件付きモデルを育てるMobile Web / PWAです。

## Core pipeline

```text
Evidence
  -> Representation / Context
  -> Model / Hypothesis
  -> Prediction Freeze
  -> Utility / Decision
  -> Outcome
  -> Feedback / Prediction Error
  -> Validation
  -> Model Snapshot / Calibration
```

## Authority boundary

- Canonical Root Theory / S01 locked validation authorityをアプリ都合で変更しない
- Canonical / Derived / Legacyを分離
- State-DynamicsはDerived module
- アプリの便利さをTheoryのTruth証明に使わない
- NOT TESTABLE / MISS / Counterexampleを正規データとして保持

## v0.5 Core Complete features

- Assessment Evidence Adapter
- Structured Natural Episode Evidence
- Evidenceの個別編集・削除
- Legacy v0.2 output isolation
- Decision Case UI
- Prediction Freeze before Outcome
- evidence cutoff / falsification conditions
- Prediction / Utility / Decision separation
- Outcome / Feedback capture
- MATCH / PARTIAL / MISS / NOT TESTABLE
- Calibration dashboard
- Counterexample ledger
- Model Snapshot / history / delta view
- State-Dynamics derived module
  - Act / Rest / Wait / Environment change
  - A-hat / R-hat / D-hat / C-hat
  - prediction freeze -> outcome -> validation
- LocalStorage schema v2 with older-state normalization
- backup JSON export/import
- full local reset
- mobile-first PWA shell

## Canonical equations referenced

E1〜E6 are stored as semantic references, not silently redefined by the app. The app operationalizes the validation loop but does not claim that the equations are empirically established.

## Extensions after Core Complete

OCR / screenshot, self-check, AI logs, cloud sync and native packaging are Input/Distribution extensions. They attach to the Evidence layer and are not blockers for Core completion.

## Verification

```bash
npm install
npm run typecheck
npm run build
```

Pinned verification environment:

- Next.js 16.3.4
- React 19.2.8
- TypeScript 7.0.2

## Privacy

The repository contains no real name, medical record, or actual personal psychological-test values. Anonymous sample data is used for development. Runtime personal data stays in browser LocalStorage unless the user explicitly exports it.

## Docs

- `docs/THEORY_SYNC_GAP.md`
- `docs/COMPLETION_PLAN.md`
- `docs/MOBILE_QA_CHECKLIST.md`
- `DECISION_AUDIT.md`
