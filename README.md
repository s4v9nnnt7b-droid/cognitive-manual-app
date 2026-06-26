# 認知書アプリ v0.2 Mobile Web MVP

公開URL：`https://cognitive-manual-app.vercel.app/`

Character OS Lite付きの「認知書アプリ」Webプロトタイプです。

## 位置づけ

- v0.1の本線：心理検査結果の手入力 → 認知タイプ仮判定 → 認知書・自分取説・対人説明書・勉強仕事モード表示
- v0.2 mobile polish：iPhone表示崩れ修正、Character OS中心ホーム、下部ナビ、画面分離
- Web先行案：Next.js / React / TypeScript / LocalStorage / PWA確認
- Character OS Lite：固定キャラ、表情、状態サマリー、今日のひとこと
- 本格OCR、AI API、本格3D、クラウド同期、課金導線は対象外

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 実装済み

- オンボーディング同意
- iPhone向けモバイルファーストUI
- Character OS Lite中心ホーム
- 下部ナビ
- プロフィール入力
- 初回登録方法の表示
  - 手入力：v0.1本線
  - スクショ / 写真読込：v0.2以降候補として表示のみ
  - 簡易セルフチェック：v0.3候補として表示のみ
  - あとで登録：出力確認用
- FIQ / VIQ / PIQ / VC / PO / WM / PS 入力
- 0〜200の範囲チェック
- 匿名サンプル投入ボタン
- 認知タイプ仮判定
- 認知書、自分取説、対人説明書、勉強・仕事モード生成
- 認知変化ログ追加
- LocalStorage保存
- 全削除
- 共有前確認・非診断表現

## 個人情報方針

このリポジトリには、実名・医療情報・個人の心理検査データを入れません。
初期値は空欄にし、動作確認用には匿名サンプルのみを使います。

## v0.2で直したこと

- スマホ表示で文章が右にはみ出す問題を修正
- 同意チェックの文章をカード内で折り返すよう修正
- 1ページ縦長構成から、ホーム / 入力 / 認知書 / ログ / 設定の画面構成へ変更
- Character OS Liteをホーム上部へ配置
- 実データに見える初期値を削除
- PWA向けmanifestを更新

## v0.3以降候補

- スクショ / 写真読込
- OCR結果の本人確認画面
- 簡易セルフチェック
- Character OSの表情差分追加
- 共有プレビュー
- クラウド同期
- AIログ連携

## 関連ドキュメント

- `DECISION_AUDIT.md`
- `docs/COMPLETION_PLAN.md`
- `docs/MOBILE_QA_CHECKLIST.md`
