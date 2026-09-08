# 自分取扱説明書 v0.6.2 Error Attribution & Pilot Metrics

公開URL：`https://cognitive-manual-app.vercel.app/`

「固定タイプを当てるアプリ」ではなく、Evidence・Prediction・Decision・Outcome・Feedback・Model Updateを分離して、自分についての条件付きモデルを育てるMobile Web / PWAです。

v0.6では、v0.5 Coreを再オープンせず、その上にDERIVEDな **Root-to-Algorithm Kernel Bridge** を追加しました。Root Theoryの共通処理骨格を、Domain固有のDecision Architectureへ変換するためのFail-Closedな入口です。

v0.6.1では、自分取説の条件付きHypothesisを関連Evidence経由でKernelへ渡し、Kernel生成時のEvidence cutoffを既存Decision Case / Prediction Freezeへ保持したまま引き継ぎます。Kernel由来Caseは`derivedFrom`で追跡できます。

v0.6.2では、Freeze前のDecision CostとOutcome後のRegret / Process Quality / Error AttributionをDecision Caseへ追加し、Calibration画面でPilot Batch進捗と集計を確認できます。

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

## v0.6 Algorithm Kernel Bridge

```text
Domain + Goal + Constraints + Evidence
  -> Readiness Check
  -> Representation phi_d
  -> Prediction P_d
  -> Utility U_d
  -> Decision delta_d
  -> Validation V_d
```

Readinessは3段階です。

- `OBSERVE_MORE`：GoalまたはEvidence不足。式を無理に作らない
- `QUALITATIVE_MODEL`：条件付きの質的モデルとして整理する
- `LOW_RISK_PILOT`：低リスクPilotへ進める。既存Decision CaseでPredictionをFreezeする

Kernelは自動実行権限を持ちません。Evidenceから支持できない確率・重み・精密値を捏造せず、High-stakes / irreversible decisionへ自動昇格しません。

## v0.6.1 Self Manual / Pilot handoff

- 関連Evidenceに接続されたModelHypothesisだけをPersonal Signalとして参照
- authority / status / confidence / conditions / boundaryConditionsを保持
- Hypothesisを固定Traitや命令規則へ自動変換しない
- Kernel生成時のEvidence cutoffをPilot Caseへ引き継ぐ
- Decision CaseにはKernel id / versionを`derivedFrom`として保存
- Prediction / Utility / DecisionはPilot画面で人間が明示してからFreeze
- Calibration画面でKernel-linked completed / assessable / MISSを分離表示

## v0.6.2 Error Attribution / Pilot Metrics

- 判断方法を `kernel-assisted` / `intuitive` / `pros-cons` / `other` で記録
- Freeze前にDecision Time / Cognitive Load / Information Costを任意記録
- Outcome後にOutcome Regret / Process Regret / Process Quality / Reversalを任意記録
- PARTIAL / MISS / NOT TESTABLEの原因候補を複数カテゴリで保存
- `mixed` / `unknown` / `insufficient-evidence` をFail-Closedな正規状態として許容
- Calibration画面でBatch 1進捗・方法別件数・平均Process Metrics・Error Attribution内訳を表示
- 1〜5指標はpsychometric scaleではなく本人内比較用の運用指標

## Authority boundary

- Canonical Root Theory / S01 locked validation authorityをアプリ都合で変更しない
- Canonical / Derived / Legacyを分離
- Algorithm Kernel / State-DynamicsはDerived layer
- アプリの便利さをTheoryのTruth証明に使わない
- NOT TESTABLE / MISS / Counterexampleを正規データとして保持
- v0.5 LocalStorage schema v2を維持し、Kernelは上位Extensionとして接続

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
- LocalStorage schema v2 with older-state normalization
- backup JSON export/import
- full local reset
- mobile-first PWA shell

## Canonical equations referenced

E1〜E6 are stored as semantic references, not silently redefined by the app. The app operationalizes the validation loop and Root-to-Domain bridge but does not claim that the equations are empirically established.

## Extensions after v0.6.2

次の優先線は、Kernelを少数の低リスクDomainで実運用し、同じ上位骨格を変更せず再利用できるかを見ることです。

優先候補：

1. Study / daily task allocation
2. Y's improvement adoption
3. tool / service choice
4. delegation
5. その後にcareer / housing / relationship等の高stakes領域

OCR / screenshot, self-check, AI logs, cloud sync and native packagingはInput / Distribution extensionsとして別線で追加できます。

## Verification

```bash
npm install
npm run typecheck
npm run build
git diff --check
```

v0.6 merge時の確認：

- `npm run typecheck` PASS
- `npm run build` PASS
- local production HTTP smoke PASS
- production URL HTTP 200
- production HTMLで `v0.6 Algorithm Kernel Bridge` を確認

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
- `docs/ALGORITHM_KERNEL_V06.md`
- `docs/LOW_RISK_PILOT_V061.md`
- `docs/ERROR_ATTRIBUTION_V062.md`
- `DECISION_AUDIT.md`
