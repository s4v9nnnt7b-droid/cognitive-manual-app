# Algorithm Kernel Bridge v0.6

Status: DERIVED / FAIL-CLOSED / v0.5 CORE UNCHANGED

## Purpose

自分取扱説明書とRoot Theoryを、Domain固有の実行可能なDecision Architectureへ接続する。

Canonical Root TheoryのTruth claimを増やすものではなく、実用Application用の派生Bridgeである。

## Fixed pipeline

```text
Domain + Goal + Constraints + Evidence
  -> Evidence coverage / readiness
  -> Representation phi_d
  -> Prediction P_d
  -> Utility U_d
  -> Decision policy delta_d
  -> Outcome
  -> Validation V_d
```

## Fail-Closed readiness

### OBSERVE_MORE

- Goalが未定義
- Domain / general Evidenceが0件
- Formula / decision recommendationを無理に生成しない

### QUALITATIVE_MODEL

- Evidenceはあるが、自然Episode・Outcome/Feedback・validated Decisionが十分でない
- 定量式や確率値へ押し込まず、条件付きの質的モデルとして扱う

### LOW_RISK_PILOT

- Goalが明示されている
- Domain/general Evidenceが存在する
- 複数の自然Episodeがあり、Outcome/Feedbackまたはvalidated Decisionがある
- 既存Decision Caseへ移動し、Outcome前にPredictionをFreezeする

上記閾値はv0.6の運用Heuristicであり、Canonical Theoryの経験的法則ではない。

## Contracts

### Representation

- Evidence provenanceを保持
- Observation / Context / Action / Outcome / Feedbackを分離
- Bias / Uncertaintyを未知のまま保持可能にする

### Prediction

- Prediction != Preference
- Evidenceから支持できないOutcome probabilityを捏造しない
- Prospective caseはOutcome前にFreezeする

### Utility

- Goal / Values / Hard Constraintsは人間側が与える
- Risk / Cost / Load / Irreversibility / Option Valueを必要時に分離
- 「起こりそう」と「望ましい」を混同しない

### Decision

- Prediction + Utility + ConstraintsからDecision候補を作る
- Kernel自体は自動実行権限を持たない
- Evidence不足ならNO EQUATION YET / OBSERVE MOREを正規出力にする

### Validation

- Prediction Freeze -> Outcome -> Feedback -> Validation
- MATCH / PARTIAL / MISS / NOT TESTABLEを保存
- MISS / Counterexampleを削除しない
- Pilot中に都合よくGenerator骨格を変更しない

## Authority boundary

- Canonical Root Theory / S01 locked authority unchanged
- v0.5 LocalStorage schema v2 unchanged
- Algorithm Kernel is DERIVED
- Application usefulness != Theory truth
- High-stakes / irreversible decisionへ自動昇格しない

## Current implementation

- `src/lib/algorithm-kernel.ts`
- `src/components/AlgorithmKernelPanel.tsx`
- HomeからAlgorithm Kernelへ遷移
- Domain / Goal / Constraints入力
- Evidence coverage / Readiness表示
- Domain Algorithm Draft生成
- LOW_RISK_PILOT時のみ既存Decision Caseへ接続

## Verification at merge

- typecheck: PASS
- production build: PASS
- git diff --check: PASS
- local production HTTP: PASS
- public deployment HTTP 200
- public marker `v0.6 Algorithm Kernel Bridge`: VERIFIED

## Next pilot line

```text
Study / daily decision
  -> repeated low-risk cases
  -> Prediction Freeze
  -> Outcome / Feedback
  -> Calibration
  -> Y's Adoption / tool choice / delegation
  -> cross-domain review
```

成功条件は「Kernelがそれっぽい説明を作れること」ではない。

同じ上位骨格をDomainごとに後付け変更せず使え、Evidence不足を検出し、Decision Process / Calibration / Frictionを実際に改善できることを評価する。
