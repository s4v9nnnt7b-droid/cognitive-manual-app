"use client";

import { useEffect, useMemo, useState } from "react";
import { CharacterOSLite } from "@/src/components/CharacterOSLite";
import { InfoCard } from "@/src/components/InfoCard";
import { MetricCard } from "@/src/components/MetricCard";
import { analyze, defaultScores, validateScores, type Scores } from "@/src/lib/cognitive";

const STORAGE_KEY = "cognitive-manual-v01";

export default function Page() {
  const [agreed, setAgreed] = useState(false);
  const [nickname, setNickname] = useState("ゲスト");
  const [purpose, setPurpose] = useState("自分の認知特性を生活・勉強に活かしたい");
  const [hasAssessment, setHasAssessment] = useState("yes");
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [timeline, setTimeline] = useState("2025年：体調不良と学習停滞。2026年：見える化とAI活用で再起動。");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setAgreed(Boolean(data.agreed));
      setNickname(data.nickname || "ゲスト");
      setPurpose(data.purpose || "自分の認知特性を生活・勉強に活かしたい");
      setHasAssessment(data.hasAssessment || "yes");
      setScores(data.scores || defaultScores);
      setTimeline(data.timeline || "");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const analysis = useMemo(() => analyze(scores), [scores]);
  const errors = validateScores(scores);

  function updateScore(key: keyof Scores, value: string) {
    setScores((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (errors.length) {
      setSavedMessage(errors[0]);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ agreed, nickname, purpose, hasAssessment, scores, timeline })
    );
    setSavedMessage("保存しました。v0.1はローカル保存のみです。");
  }

  function clearAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    setAgreed(false);
    setNickname("ゲスト");
    setPurpose("自分の認知特性を生活・勉強に活かしたい");
    setHasAssessment("yes");
    setScores(defaultScores);
    setTimeline("");
    setSavedMessage("全削除しました。");
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">認知書アプリ v0.1 Web MVP</p>
        <h1>自分を責める前に、取扱説明書を作る。</h1>
        <p>心理検査結果や自己入力を、生活で使える認知書・自分取説・対人説明書へ変換する自己理解支援アプリです。</p>
      </header>

      <section className="notice-card">
        <h2>最初に確認</h2>
        <p>このアプリは医療診断、WAIS等の正式検査の代替、治療方針の提示を行いません。出力は「傾向」「仮説」「負荷条件」として扱います。</p>
        <label className="check-row">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          理解しました。センシティブ情報は自分の判断で入力します。
        </label>
      </section>

      {agreed ? (
        <>
          <section className="profile-grid">
            <label>ニックネーム<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
            <label>利用目的<input value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
            <label>心理検査の有無<select value={hasAssessment} onChange={(event) => setHasAssessment(event.target.value)}><option value="yes">検査結果がある</option><option value="no">まだない</option><option value="unknown">わからない</option></select></label>
          </section>

          <CharacterOSLite analysis={analysis} />

          <section className="method-grid">
            <InfoCard title="① 手入力 v0.1本線"><p>FIQ / VIQ / PIQ / VC / PO / WM / PS を入力して認知書を生成します。</p></InfoCard>
            <InfoCard title="② スクショ / 写真読込 v0.2"><p>検査結果用紙をOCRで読み取り、本人確認後に保存する将来機能です。</p></InfoCard>
            <InfoCard title="③ 簡易セルフチェック v0.3"><p>正式検査ではなく、傾向把握用の入口として実装予定です。</p></InfoCard>
            <InfoCard title="④ あとで登録"><p>まず画面と出力だけ確認できます。</p></InfoCard>
          </section>

          <section className="input-card">
            <h2>心理テスト結果を入力</h2>
            <div className="score-grid">
              <label>検査名<input value={scores.testName} onChange={(e) => updateScore("testName", e.target.value)} /></label>
              <label>検査日<input value={scores.testDate} onChange={(e) => updateScore("testDate", e.target.value)} placeholder="2026-06-26" /></label>
              <label>FIQ<input type="number" value={scores.fiq} onChange={(e) => updateScore("fiq", e.target.value)} /></label>
              <label>VIQ<input type="number" value={scores.viq} onChange={(e) => updateScore("viq", e.target.value)} /></label>
              <label>PIQ<input type="number" value={scores.piq} onChange={(e) => updateScore("piq", e.target.value)} /></label>
              <label>VC / VCI<input type="number" value={scores.vc} onChange={(e) => updateScore("vc", e.target.value)} /></label>
              <label>PO / PRI<input type="number" value={scores.po} onChange={(e) => updateScore("po", e.target.value)} /></label>
              <label>WM / WMI<input type="number" value={scores.wm} onChange={(e) => updateScore("wm", e.target.value)} /></label>
              <label>PS / PSI<input type="number" value={scores.ps} onChange={(e) => updateScore("ps", e.target.value)} /></label>
            </div>
            <label>当時の状態メモ<textarea value={scores.memo} onChange={(e) => updateScore("memo", e.target.value)} /></label>
            {errors.length ? <p className="error-text">{errors[0]}</p> : null}
          </section>

          <section className="metrics-grid">
            <MetricCard label="仮タイプ" value={analysis.type} sub="非診断" />
            <MetricCard label="強み" value={analysis.strength} sub="出力に使う軸" />
            <MetricCard label="負荷" value={analysis.load} sub="詰まりやすさ" />
            <MetricCard label="保存" value="Local" sub="v0.1" />
          </section>

          <section className="result-grid">
            <InfoCard title="心理テスト結果"><p>{analysis.summary}</p></InfoCard>
            <InfoCard title="認知書"><p>{analysis.report}</p></InfoCard>
            <InfoCard title="自分取説"><p>{analysis.manual}</p></InfoCard>
            <InfoCard title="対人説明書"><p>{analysis.interpersonal}</p></InfoCard>
            <InfoCard title="勉強・仕事モード"><p>{analysis.workMode}</p></InfoCard>
            <InfoCard title="認知変化ログ"><textarea value={timeline} onChange={(event) => setTimeline(event.target.value)} /></InfoCard>
          </section>

          <section className="actions">
            <button type="button" onClick={save}>保存する</button>
            <button type="button" className="secondary" onClick={clearAll}>全削除</button>
            <p aria-live="polite">{savedMessage}</p>
          </section>
        </>
      ) : (
        <section className="empty-state"><p>同意チェック後に、Character OS Lite付きホームと入力フォームが表示されます。</p></section>
      )}
    </main>
  );
}
