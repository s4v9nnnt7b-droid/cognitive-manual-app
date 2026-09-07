# 自分取扱説明書 v0.3 Theory Sync Foundation

公開中のmain：`https://cognitive-manual-app.vercel.app/`

このブランチは、v0.2 Mobile Web MVPを捨てずに、2026-08以降のSELF-THEORY / 共通思考エンジン / Evidence-first設計へ同期するためのv0.3 foundationです。

## 位置づけ

v0.2は有用なMobile/PWA shellですが、推論Coreは主に「心理検査スコア → ルールベース仮判定 → 説明文」でした。

v0.3 foundationでは、心理検査を人格そのものではなくEvidenceの一種として扱い、将来的に次のループを実装できるデータ構造へ移行します。

```text
Evidence
  -> Domain representation
  -> Common Engine / Model
  -> Prediction
  -> Utility / Preference
  -> Decision
  -> Outcome
  -> Feedback
  -> Model Update
```

## Authority boundary

- Canonical Root Theory / S01 locked validation authorityをアプリ都合で書き換えない
- Canonical / Derived / Legacyを分離する
- アプリが便利であることをTheoryのTruthの証明に使わない
- Evidence不足ではNOT TESTABLEを許容する
- 反証・Prediction Errorを消さずに保持する

## 実装済み — v0.3 foundation

- Theory Sync Gap Audit（18項目）
- versioned Theory/Evidence domain model
- E1〜E6の参照manifest
- Theory authority: canonical / derived / legacy
- AssessmentをEvidenceへ変換するAdapter
- 旧v0.2ルール出力をprovisional legacy hypothesisとして隔離
- Structured Natural Episode入力
  - domain
  - observation
  - context/state
  - action
  - outcome
  - feedback
- Hypothesis confidence / support / counterevidence / boundary condition用data contract
- DecisionCase contract
  - evidence
  - goal / constraints
  - prediction
  - uncertainty
  - utility
  - decision
  - outcome / feedback
  - validation
- LocalStorage v0.3 schema
- v0.2 LocalStorageからの読み込み移行
- v0.2旧形式メモの互換保持
- Character OSをModelの上に載るpresentation layerへ後退
- current toolchainをpin
- TypeScript targetを現行Next.jsへ更新

## まだfoundation段階のもの

- E1〜E6そのものを推論Engineとして実装すること
- Domain Adapter `phi_d`
- Prediction / Utility / Decision UI
- Outcome後のCalibration / Prediction Error view
- Counterexample / Support adjudication UI
- Model history / version diff
- State-Dynamics module
- granular delete / export / import
- OCR / screenshot ingestion
- Self-check ingestion
- AI conversation/log ingestion
- cloud sync

OCRやセルフチェックはProduct Coreではなく、CoreへEvidenceを渡すInput Adapterとして後段で実装します。

## 起動・検証

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

検証済み環境：

- Next.js 16.3.4
- React 19.2.8
- TypeScript 7.0.2

## 個人情報方針

このリポジトリには実名・医療情報・本人の実心理検査値をコミットしません。
初期値は空欄、動作確認用は匿名サンプルのみです。

## 関連ドキュメント

- `docs/THEORY_SYNC_GAP.md`
- `DECISION_AUDIT.md`
- `docs/COMPLETION_PLAN.md`
- `docs/MOBILE_QA_CHECKLIST.md`

## 現在の次工程

1. foundation QA
2. Structured Evidenceの編集・削除
3. DecisionCase UI
4. Prediction -> Outcome -> Feedback -> Validation loop
5. Model snapshot/history
6. State-Dynamics derived module
7. OCR / Self-check / AI logをEvidence Adapterとして追加
