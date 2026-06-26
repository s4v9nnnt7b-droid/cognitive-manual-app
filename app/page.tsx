"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyze,
  defaultScores,
  demoScores,
  scoreKeys,
  validateScores,
  type ScoreKey,
  type Scores
} from "@/src/lib/cognitive";

const STORAGE_KEY = "cognitive-manual-v02-mobile";

type View = "home" | "profile" | "input" | "results" | "log" | "settings";

const scoreFields: Array<{ key: ScoreKey; label: string; note: string }> = [
  { key: "fiq", label: "FIQ", note: "全体" },
  { key: "viq", label: "VIQ", note: "言語性" },
  { key: "piq", label: "PIQ", note: "動作性" },
  { key: "vc", label: "VC / VCI", note: "言語理解" },
  { key: "po", label: "PO / PRI", note: "知覚推理" },
  { key: "wm", label: "WM / WMI", note: "作動記憶" },
  { key: "ps", label: "PS / PSI", note: "処理速度" }
];

const expressionFace = {
  normal: "😊",
  thinking: "🤔",
  focus: "🧠",
  tired: "😟",
  relief: "😌",
  celebrate: "🎉"
} as const;

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: "home", label: "ホーム", icon: "⌂" },
  { view: "input", label: "入力", icon: "＋" },
  { view: "results", label: "認知書", icon: "文" },
  { view: "log", label: "ログ", icon: "線" },
  { view: "settings", label: "設定", icon: "⚙" }
];

export default function Page() {
  const [agreed, setAgreed] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [view, setView] = useState<View>("home");
  const [nickname, setNickname] = useState("ゲスト");
  const [purpose, setPurpose] = useState("自分の認知特性を生活・勉強に活かしたい");
  const [hasAssessment, setHasAssessment] = useState("yes");
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [timeline, setTimeline] = useState("変化ログはまだありません。出来事、体調、環境、学習状況などを短く残せます。");
  const [savedMessage, setSavedMessage] = useState("");

  const hasScores = useMemo(() => scoreKeys.some((key) => scores[key].trim() !== ""), [scores]);
  const scoreErrors = useMemo(() => (hasScores ? validateScores(scores) : []), [hasScores, scores]);
  const analysis = useMemo(() => analyze(scores), [scores]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setAgreed(Boolean(data.agreed));
      setConsentChecked(Boolean(data.agreed));
      setNickname(data.nickname || "ゲスト");
      setPurpose(data.purpose || "自分の認知特性を生活・勉強に活かしたい");
      setHasAssessment(data.hasAssessment || "yes");
      setScores(data.scores || defaultScores);
      setTimeline(data.timeline || "");
      setView(data.view || "home");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persist(message: string, options?: { requireScores?: boolean }) {
    if (options?.requireScores && !hasScores) {
      setSavedMessage("まずは1つ以上の指数を入力してください。");
      return false;
    }
    if (scoreErrors.length) {
      setSavedMessage(scoreErrors[0]);
      return false;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ agreed: true, nickname, purpose, hasAssessment, scores, timeline, view })
    );
    setSavedMessage(message);
    return true;
  }

  function startApp() {
    if (!consentChecked) return;
    setAgreed(true);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ agreed: true, nickname, purpose, hasAssessment, scores, timeline, view: "home" })
    );
  }

  function updateScore(key: keyof Scores, value: string) {
    setScores((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function clearAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    setAgreed(false);
    setConsentChecked(false);
    setView("home");
    setNickname("ゲスト");
    setPurpose("自分の認知特性を生活・勉強に活かしたい");
    setHasAssessment("yes");
    setScores(defaultScores);
    setTimeline("変化ログはまだありません。出来事、体調、環境、学習状況などを短く残せます。");
    setSavedMessage("全削除しました。");
  }

  if (!agreed) {
    return (
      <main className="start-shell">
        <section className="start-card">
          <div className="brand-row">
            <div className="mini-logo">認</div>
            <span>認知書アプリ</span>
          </div>
          <h1>自分を責める前に、取扱説明書を作る。</h1>
          <p className="lead-text">心理検査結果や自己入力を、生活で使える認知書・自分取説・対人説明書へ変換するWebアプリです。</p>

          <div className="safety-box">
            <h2>最初に確認</h2>
            <p>このアプリは医療診断、WAIS等の正式検査の代替、治療方針の提示を行いません。出力は「傾向」「仮説」「負荷条件」として扱います。</p>
            <label className="consent-row">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
              />
              <span>理解しました。センシティブ情報は自分の判断で入力します。</span>
            </label>
          </div>

          <button type="button" className="primary-button full" disabled={!consentChecked} onClick={startApp}>
            Character OS Liteを開く
          </button>
          <p className="micro-copy">v0.1本線は手入力です。スクショOCRと簡易セルフチェックは次フェーズ候補です。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-app">
      <header className="top-bar">
        <button type="button" className="icon-button" onClick={() => setView("home")} aria-label="ホームへ戻る">
          認
        </button>
        <div>
          <p className="eyebrow">Character OS Lite</p>
          <h1>{view === "home" ? "認知書" : navItems.find((item) => item.view === view)?.label}</h1>
        </div>
        <button type="button" className="ghost-button" onClick={() => persist("保存しました。")}>保存</button>
      </header>

      {view === "home" ? (
        <section className="screen-stack">
          <article className="character-stage">
            <div className="avatar-orb" aria-hidden="true">{expressionFace[analysis.expression]}</div>
            <div className="character-copy">
              <span className="status-chip">{hasScores ? "生成済み" : "未登録"}</span>
              <h2>{analysis.type}</h2>
              <p>{analysis.oneLine}</p>
            </div>
          </article>

          <section className="today-card">
            <p className="eyebrow">今日のひとこと</p>
            <h3>頭の中で抱えず、まず外に出す。</h3>
            <p>見える形にした瞬間、整理はもう始まっています。</p>
          </section>

          <section className="metric-strip" aria-label="状態サマリー">
            <div><span>強み</span><strong>{analysis.strength}</strong></div>
            <div><span>負荷</span><strong>{analysis.load}</strong></div>
            <div><span>保存</span><strong>Local</strong></div>
          </section>

          <section className="menu-grid" aria-label="主要メニュー">
            <button type="button" onClick={() => setView("input")}><span>心理テスト結果</span><small>手入力</small></button>
            <button type="button" onClick={() => setView("results")}><span>認知書</span><small>仮判定</small></button>
            <button type="button" onClick={() => setView("results")}><span>自分取説</span><small>動かし方</small></button>
            <button type="button" onClick={() => setView("results")}><span>対人説明書</span><small>伝え方</small></button>
            <button type="button" onClick={() => setView("results")}><span>勉強・仕事</span><small>環境設計</small></button>
            <button type="button" onClick={() => setView("log")}><span>変化ログ</span><small>時系列</small></button>
          </section>

          <section className="phase-card">
            <h3>初回登録方法</h3>
            <div className="phase-list">
              <button type="button" onClick={() => setView("input")}><b>① 手入力</b><span>v0.1本線。今すぐ使用可。</span></button>
              <button type="button" disabled><b>② スクショ / 写真読込</b><span>v0.2候補。OCR本人確認つき。</span></button>
              <button type="button" disabled><b>③ 簡易セルフチェック</b><span>v0.3候補。正式検査の代替ではない。</span></button>
              <button type="button" onClick={() => setView("results")}><b>④ あとで登録</b><span>まず出力イメージだけ確認。</span></button>
            </div>
          </section>
        </section>
      ) : null}

      {view === "profile" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <h2>プロフィール</h2>
            <p>v0.1では最小限だけ保存します。実名や医療情報は入れなくて大丈夫です。</p>
            <label>ニックネーム<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
            <label>利用目的<input value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
            <label>心理検査の有無
              <select value={hasAssessment} onChange={(event) => setHasAssessment(event.target.value)}>
                <option value="yes">検査結果がある</option>
                <option value="no">まだない</option>
                <option value="unknown">わからない</option>
              </select>
            </label>
            <button type="button" className="primary-button" onClick={() => persist("プロフィールを保存しました。")}>保存する</button>
          </article>
        </section>
      ) : null}

      {view === "input" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">v0.1 本線</p>
                <h2>心理テスト結果を入力</h2>
              </div>
              <button type="button" className="small-button" onClick={() => setScores(demoScores)}>匿名サンプル</button>
            </div>
            <p>手元にある項目だけ入力できます。0〜200以外は保存時に警告します。</p>

            <div className="compact-grid">
              <label>検査名<input value={scores.testName} onChange={(event) => updateScore("testName", event.target.value)} placeholder="例：WAIS系検査" /></label>
              <label>検査日<input value={scores.testDate} onChange={(event) => updateScore("testDate", event.target.value)} placeholder="例：2026-06-26" /></label>
            </div>

            <div className="score-list">
              {scoreFields.map((field) => (
                <label key={field.key} className="score-row">
                  <span><b>{field.label}</b><small>{field.note}</small></span>
                  <input
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="200"
                    value={scores[field.key]}
                    onChange={(event) => updateScore(field.key, event.target.value)}
                    placeholder="未入力"
                  />
                </label>
              ))}
            </div>

            <label>当時の状態メモ<textarea value={scores.memo} onChange={(event) => updateScore("memo", event.target.value)} placeholder="睡眠、体調、環境、気づいたことなど" /></label>
            {scoreErrors.length ? <p className="error-text">{scoreErrors[0]}</p> : <p className="hint-text">この画面の値は端末のLocalStorageに保存されます。</p>}

            <div className="button-row">
              <button type="button" className="primary-button" onClick={() => { if (persist("入力を保存しました。", { requireScores: true })) setView("results"); }}>結果を見る</button>
              <button type="button" className="secondary-button" onClick={() => setScores(defaultScores)}>入力を空にする</button>
            </div>
          </article>
        </section>
      ) : null}

      {view === "results" ? (
        <section className="screen-stack">
          <article className="result-hero">
            <span className="status-chip">非診断</span>
            <h2>{analysis.type}</h2>
            <p>{analysis.summary}</p>
          </article>
          <ResultCard title="認知書" body={analysis.report} />
          <ResultCard title="自分取説" body={analysis.manual} />
          <ResultCard title="対人説明書" body={analysis.interpersonal} />
          <ResultCard title="勉強・仕事モード" body={analysis.workMode} />
          <article className="panel-card warning-card">
            <h3>共有前確認</h3>
            <p>この出力は自己理解支援用です。家族・支援者・職場などへ共有する前に、見せたくない情報が含まれていないか確認してください。</p>
          </article>
        </section>
      ) : null}

      {view === "log" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <h2>認知変化ログ</h2>
            <p>年月、出来事、心身状態、環境、現在との差分を短く残します。</p>
            <textarea className="large-textarea" value={timeline} onChange={(event) => setTimeline(event.target.value)} />
            <button type="button" className="primary-button" onClick={() => persist("変化ログを保存しました。")}>ログを保存する</button>
          </article>
        </section>
      ) : null}

      {view === "settings" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <h2>設定・データ管理</h2>
            <div className="settings-list">
              <div><b>保存方式</b><span>LocalStorage</span></div>
              <div><b>本格OCR</b><span>v0.2以降</span></div>
              <div><b>簡易セルフチェック</b><span>v0.3以降</span></div>
              <div><b>AI API</b><span>v0.1では未使用</span></div>
            </div>
            <button type="button" className="primary-button" onClick={() => persist("保存しました。")}>現在の内容を保存</button>
            <button type="button" className="danger-button" onClick={clearAll}>同意・入力・保存データを全削除</button>
            {savedMessage ? <p className="save-message">{savedMessage}</p> : null}
          </article>
        </section>
      ) : null}

      {savedMessage && view !== "settings" ? <p className="toast" aria-live="polite">{savedMessage}</p> : null}

      <nav className="bottom-nav" aria-label="下部ナビゲーション">
        {navItems.map((item) => (
          <button
            key={item.view}
            type="button"
            aria-current={view === item.view ? "page" : undefined}
            onClick={() => setView(item.view)}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}

function ResultCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="panel-card result-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
