# Low-risk Pilot Protocol v0.6.1

Status: DERIVED APPLICATION VALIDATION / NOT CANONICAL THEORY CHANGE

## Purpose

Root-to-Algorithm Kernelが、自然な低リスクDecisionで「自分取説の条件付きSignal + Evidence cutoff + Prediction Freeze」を一続きに運用できるか確認する。

便利さや一致率だけでRoot TheoryのTruthを証明しない。

## Pilot scope

優先順：

1. Study / daily task allocation
2. Y's improvement adoption
3. tool / service choice
4. delegation

Career / housing / relationship等の高stakes・不可逆性が高い領域は、初期Pilotの成功だけで自動昇格しない。

## Case entry gate

Kernel側で`LOW_RISK_PILOT`になったCaseのみ、Kernel handoffとしてDecision Caseへ進む。

`OBSERVE_MORE` / `QUALITATIVE_MODEL`は正常なFail-Closed出力であり、失敗扱いしない。

## Pre-outcome contract

Outcomeを見る前に以下を固定する：

- Domain
- Goal
- Hard Constraints
- Evidence cutoff
- Kernel id / generator version
- Prediction
- Falsification conditions
- Uncertainty
- Utility / Preference
- Decision

Prediction != Preference != Decision を維持する。

## Post-outcome contract

Outcome後にのみ記録する：

- Outcome
- Feedback / Prediction Error
- Validation: MATCH / PARTIAL / MISS / NOT TESTABLE

MISS / Counterexampleは削除しない。Outcome後にKernel骨格やCase専用Parameterを変更して「当たり」にしない。

## Pilot Batch 1

最初の5 completed Kernel-linked Casesを、初回の運用レビュー単位とする。これは統計的な証明閾値ではなく、UX・追跡可能性・Fail-Closed動作を早期点検するためのOperational checkpoint。

レビューする項目：

- Kernel handoff source metadataが5/5で保存されるか
- Evidence cutoffが保持されるか
- Prediction / Utility / Decisionが分離されるか
- NOT TESTABLE / MISSが問題なく保存されるか
- Kernel由来CaseがCalibration画面で追跡できるか
- Pilot中にDomain-specificな例外ルールを増殖させず運用できるか

## Phase C exit candidate

Batch 1で追跡・保存・Fail-Closedに構造的な欠陥がなければ、同じKernel骨格のままY's Adoption / tool choice等へ次Domainを追加する。

構造的な欠陥があれば、Pilot中のCaseを改変せずIssueとして記録し、v0.6.2候補で修正する。

## Authority boundary

- Canonical Root Theory unchanged
- S01 locked validation authority unchanged
- v0.5 Core semantics unchanged
- v0.6.1 Pilot protocol is DERIVED
- Operational success != empirical proof of Root Theory
