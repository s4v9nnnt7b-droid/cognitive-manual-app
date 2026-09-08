"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  analyze,
  defaultScores,
  demoScores,
  scoreKeys,
  validateScores,
  type ScoreKey,
  type Scores
} from "@/src/lib/cognitive";
import { AlgorithmKernelPanel } from "@/src/components/AlgorithmKernelPanel";
import type { KernelDecisionSeed } from "@/src/lib/algorithm-kernel";
import { DecisionLoopPanel } from "@/src/components/DecisionLoopPanel";
import { EvidenceManager } from "@/src/components/EvidenceManager";
import { ModelOpsPanel } from "@/src/components/ModelOpsPanel";
import {
  APP_MODEL_VERSION,
  THEORY_SPEC_VERSION,
  emptyTheorySyncState,
  makeLegacyHypothesis,
  normalizeTheoryState,
  theorySyncCoverage,
  upsertAssessmentEvidence,
  type EvidenceDomain,
  type EvidenceItem,
  type TheorySyncState
} from "@/src/lib/theory";

const LEGACY_STORAGE_KEY = "cognitive-manual-v02-mobile";
const STORAGE_KEY = "cognitive-manual-v03-theory-sync";

type View = "home" | "profile" | "input" | "results" | "kernel" | "decision" | "modelops" | "log" | "settings";

const viewTitles: Record<View, string> = {
  home: "自分取扱説明書",
  profile: "プロフィール",
  input: "入力",
  results: "現在モデル",
  kernel: "Algorithm Kernel",
  decision: "判断",
  modelops: "検証",
  log: "Evidence",
  settings: "Theory / 設定"
};

const scoreFields: Array<{ key: ScoreKey; label: string; note: string }> = [
  { key: "fiq", label: "FIQ", note: "全体" },
  { key: "viq", label: "VIQ", note: "言語性" },
  { key: "piq", label: "PIQ", note: "動作性" },
  { key: "vc", label: "VC / VCI", note: "言語理解" },
  { key: "po", label: "PO / PRI", note: "知覚推理" },
  { key: "wm", label: "WM / WMI", note: "作動記憶" },
  { key: "ps", label: "PS / PSI", note: "処理速度" }
];

const domainOptions: Array<{ value: EvidenceDomain; label: string }> = [
  { value: "general", label: "全般" },
  { value: "study", label: "勉強" },
  { value: "work", label: "仕事" },
  { value: "relationship", label: "人間関係" },
  { value: "health-routine", label: "体調・生活運用" },
  { value: "sport", label: "スポーツ" },
  { value: "technology", label: "技術・AI" },
  { value: "decision", label: "意思決定" },
  { value: "other", label: "その他" }
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
  { view: "decision", label: "判断", icon: "◎" },
  { view: "log", label: "Evidence", icon: "線" },
  { view: "modelops", label: "検証", icon: "◫" }
];

export default function Page() {
  const [agreed, setAgreed] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [view, setView] = useState<View>("home");
  const [nickname, setNickname] = useState("ゲスト");
  const [purpose, setPurpose] = useState("自分の傾向と条件を理解し、日常の判断・行動に活かしたい");
  const [hasAssessment, setHasAssessment] = useState("yes");
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [timeline, setTimeline] = useState("旧形式メモはまだありません。");
  const [theoryState, setTheoryState] = useState<TheorySyncState>(emptyTheorySyncState);
  const [kernelDecisionSeed, setKernelDecisionSeed] = useState<KernelDecisionSeed | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  const [episodeDomain, setEpisodeDomain] = useState<EvidenceDomain>("general");
  const [episodeSummary, setEpisodeSummary] = useState("");
  const [episodeContext, setEpisodeContext] = useState("");
  const [episodeAction, setEpisodeAction] = useState("");
  const [episodeOutcome, setEpisodeOutcome] = useState("");
  const [episodeFeedback, setEpisodeFeedback] = useState("");

  const hasScores = useMemo(() => scoreKeys.some((key) => scores[key].trim() !== ""), [scores]);
  const scoreErrors = useMemo(() => (hasScores ? validateScores(scores) : []), [hasScores, scores]);
  const analysis = useMemo(() => analyze(scores), [scores]);
  const coverage = useMemo(() => theorySyncCoverage(theoryState), [theoryState]);

  useEffect(() => {
    const currentRaw = window.localStorage.getItem(STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = currentRaw || legacyRaw;
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      const loadedScores: Scores = data.scores || defaultScores;
      const loadedAnalysis = analyze(loadedScores);
      let loadedTheory: TheorySyncState = normalizeTheoryState(data.theoryState || emptyTheorySyncState);
      loadedTheory = syncTheoryFromLegacyOutputs(loadedTheory, loadedScores, loadedAnalysis);

      setAgreed(Boolean(data.agreed));
      setConsentChecked(Boolean(data.agreed));
      setNickname(data.nickname || "ゲスト");
      setPurpose(data.purpose || "自分の傾向と条件を理解し、日常の判断・行動に活かしたい");
      setHasAssessment(data.hasAssessment || "yes");
      setScores(loadedScores);
      setTimeline(data.timeline || "");
      setTheoryState(loadedTheory);
      setView(data.view || "home");
    } catch {
      if (currentRaw) window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function buildPayload(nextTheory: TheorySyncState, nextView: View = view) {
    return {
      agreed: true,
      nickname,
      purpose,
      hasAssessment,
      scores,
      timeline,
      view: nextView,
      theoryState: nextTheory
    };
  }

  function persist(message: string, options?: { requireScores?: boolean; theoryOverride?: TheorySyncState; viewOverride?: View }) {
    if (options?.requireScores && !hasScores) {
      setSavedMessage("まずは1つ以上の指数を入力してください。");
      return false;
    }
    if (scoreErrors.length) {
      setSavedMessage(scoreErrors[0]);
      return false;
    }

    const syncedTheory = syncTheoryFromLegacyOutputs(
      options?.theoryOverride || theoryState,
      scores,
      analysis
    );
    setTheoryState(syncedTheory);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(syncedTheory, options?.viewOverride || view)));
    setSavedMessage(message);
    return true;
  }

  function startApp() {
    if (!consentChecked) return;
    setAgreed(true);
    const syncedTheory = syncTheoryFromLegacyOutputs(theoryState, scores, analysis);
    setTheoryState(syncedTheory);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(syncedTheory, "home")));
  }

  function updateScore(key: keyof Scores, value: string) {
    setScores((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function addNaturalEpisode() {
    if (!episodeSummary.trim()) {
      setSavedMessage("まず『何が起きたか』を短く入力してください。");
      return;
    }

    const item: EvidenceItem = {
      id: `episode-${Date.now()}`,
      source: "natural-episode",
      domain: episodeDomain,
      observedAt: new Date().toISOString(),
      summary: episodeSummary.trim(),
      context: episodeContext.trim() || undefined,
      action: episodeAction.trim() || undefined,
      outcome: episodeOutcome.trim() || undefined,
      feedback: episodeFeedback.trim() || undefined,
      confidence: "provisional",
      tags: ["naturalistic", episodeDomain]
    };

    const nextTheory: TheorySyncState = {
      ...theoryState,
      evidence: [item, ...theoryState.evidence]
    };

    setTheoryState(nextTheory);
    setEpisodeSummary("");
    setEpisodeContext("");
    setEpisodeAction("");
    setEpisodeOutcome("");
    setEpisodeFeedback("");
    persist("自然エピソードをEvidenceとして保存しました。", { theoryOverride: nextTheory });
  }

  function exportBackup() {
    const syncedTheory = syncTheoryFromLegacyOutputs(theoryState, scores, analysis);
    const payload = buildPayload(syncedTheory, view);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `self-manual-v05-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSavedMessage("バックアップJSONを書き出しました。");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const loadedScores: Scores = data.scores || defaultScores;
      const loadedAnalysis = analyze(loadedScores);
      const loadedTheory = syncTheoryFromLegacyOutputs(normalizeTheoryState(data.theoryState), loadedScores, loadedAnalysis);
      setAgreed(true);
      setConsentChecked(true);
      setNickname(data.nickname || "ゲスト");
      setPurpose(data.purpose || "自分の傾向と条件を理解し、日常の判断・行動に活かしたい");
      setHasAssessment(data.hasAssessment || "unknown");
      setScores(loadedScores);
      setTimeline(data.timeline || "");
      setTheoryState(loadedTheory);
      setView("home");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, agreed: true, scores: loadedScores, theoryState: loadedTheory, view: "home" }));
      setSavedMessage("バックアップJSONを読み込みました。");
    } catch {
      setSavedMessage("バックアップJSONを読み込めませんでした。");
    } finally {
      event.target.value = "";
    }
  }

  function clearAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setAgreed(false);
    setConsentChecked(false);
    setView("home");
    setNickname("ゲスト");
    setPurpose("自分の傾向と条件を理解し、日常の判断・行動に活かしたい");
    setHasAssessment("yes");
    setScores(defaultScores);
    setTimeline("旧形式メモはまだありません。");
    setTheoryState(emptyTheorySyncState);
    setSavedMessage("全削除しました。");
  }

  if (!agreed) {
    return (
      <main className="start-shell">
        <section className="start-card">
          <div className="brand-row">
            <div className="mini-logo">認</div>
            <span>自分取扱説明書</span>
          </div>
          <h1>人格ではなく、パターンと条件を見る。</h1>
          <p className="lead-text">
            心理検査、自己報告、日常の自然な出来事をEvidenceとして残し、「どんな条件でどう動きやすいか」を更新していくWebアプリです。
          </p>

          <div className="safety-box">
            <h2>最初に確認</h2>
            <p>
              このアプリは医療診断や正式な心理検査の代替ではありません。出力は固定人格の判定ではなく、条件付きの仮説・Evidence・予測・更新履歴として扱います。
            </p>
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
            自分のモデルを開く
          </button>
          <p className="micro-copy">v0.6.2 Error Attribution & Pilot Metrics。判断プロセスとPrediction Errorの原因候補を、Outcome後に分離して検証します。</p>
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
          <p className="eyebrow">Evidence → Prediction → Feedback</p>
          <h1>{viewTitles[view]}</h1>
        </div>
        <button type="button" className="ghost-button" onClick={() => persist("保存しました。")}>保存</button>
      </header>

      {view === "home" ? (
        <section className="screen-stack">
          <article className="character-stage">
            <div className="avatar-orb" aria-hidden="true">{expressionFace[analysis.expression]}</div>
            <div className="character-copy">
              <span className="status-chip">{coverage.totalEvidence ? "Evidenceあり" : "観測開始"}</span>
              <h2>{hasScores ? `${analysis.type}（暫定仮説）` : "モデルはこれから育つ"}</h2>
              <p>{hasScores ? analysis.oneLine : "心理検査だけで決めず、複数の場面と条件からモデルを更新します。"}</p>
            </div>
          </article>

          <section className="today-card">
            <p className="eyebrow">現在の原則</p>
            <h3>一回の行動を人格にしない。</h3>
            <p>何が入力され、どんな状態・条件で、何が起きたかを分けて観察します。</p>
          </section>

          <section className="metric-strip" aria-label="Theory Sync状態">
            <div><span>Evidence</span><strong>{coverage.totalEvidence}</strong></div>
            <div><span>自然Episode</span><strong>{coverage.naturalEpisodeCount}</strong></div>
            <div><span>Phase</span><strong>{coverage.phase}</strong></div>
          </section>

          <section className="menu-grid" aria-label="主要メニュー">
            <button type="button" onClick={() => setView("input")}><span>Evidence入力</span><small>心理検査</small></button>
            <button type="button" onClick={() => setView("log")}><span>自然Episode</span><small>出来事・条件</small></button>
            <button type="button" onClick={() => setView("decision")}><span>Decision Case</span><small>Prediction Freeze</small></button>
            <button type="button" onClick={() => setView("results")}><span>現在モデル</span><small>暫定仮説</small></button>
            <button type="button" onClick={() => setView("modelops")}><span>検証・履歴</span><small>Calibration</small></button>
            <button type="button" onClick={() => setView("kernel")}><span>Algorithm Kernel</span><small>Theory → Domain</small></button>
            <button type="button" onClick={() => setView("results")}><span>対人説明</span><small>共有前確認</small></button>
            <button type="button" onClick={() => setView("settings")}><span>Theory / 設定</span><small>{THEORY_SPEC_VERSION}</small></button>
          </section>

          <section className="phase-card">
            <h3>Evidenceの入口</h3>
            <div className="phase-list">
              <button type="button" onClick={() => setView("input")}><b>① 心理検査</b><span>構造化Evidenceの1つ。人格そのものではない。</span></button>
              <button type="button" onClick={() => setView("log")}><b>② 自然Episode</b><span>日常で実際に起きたこと・条件・結果を記録。</span></button>
              <button type="button" disabled><b>③ OCR / 写真読込</b><span>将来のEvidence Adapter。Core完成後に追加。</span></button>
              <button type="button" disabled><b>④ セルフチェック</b><span>将来のSelf-report Adapter。正式検査の代替ではない。</span></button>
            </div>
          </section>
        </section>
      ) : null}

      {view === "profile" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <h2>プロフィール</h2>
            <p>実名や医療情報を入れる必要はありません。目的はモデルの利用目的を明示することです。</p>
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
                <p className="eyebrow">Evidence Adapter / Assessment</p>
                <h2>心理検査結果を入力</h2>
              </div>
              <button type="button" className="small-button" onClick={() => setScores(demoScores)}>匿名サンプル</button>
            </div>
            <p>検査値は重要なEvidenceですが、これだけで固定タイプや人格を決めません。手元にある項目だけ入力できます。</p>

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

            <label>当時の状態・条件<textarea value={scores.memo} onChange={(event) => updateScore("memo", event.target.value)} placeholder="睡眠、体調、環境、薬、負荷、気づいたことなど" /></label>
            {scoreErrors.length ? <p className="error-text">{scoreErrors[0]}</p> : <p className="hint-text">保存時にAssessment Evidenceへ変換されます。</p>}

            <div className="button-row">
              <button type="button" className="primary-button" onClick={() => { if (persist("心理検査をEvidenceとして保存しました。", { requireScores: true, viewOverride: "results" })) setView("results"); }}>モデルへ反映</button>
              <button type="button" className="secondary-button" onClick={() => setScores(defaultScores)}>入力を空にする</button>
            </div>
          </article>
        </section>
      ) : null}

      {view === "results" ? (
        <section className="screen-stack">
          <article className="result-hero">
            <span className="status-chip">暫定・非診断</span>
            <h2>{hasScores ? analysis.type : "Evidence不足"}</h2>
            <p>{hasScores ? analysis.summary : "まだ固定的な説明を作る段階ではありません。Evidenceを増やして条件と反例を見ます。"}</p>
          </article>

          <article className="panel-card warning-card">
            <h3>Theory Sync Status</h3>
            <p>旧v0.2ルールベース出力はLegacy仮説として保持し、現在はEvidence・Prediction・Validation・Snapshot・Counterexampleを分離して運用します。</p>
            <div className="settings-list">
              <div><b>Theory</b><span>{THEORY_SPEC_VERSION}</span></div>
              <div><b>App model</b><span>{APP_MODEL_VERSION}</span></div>
              <div><b>Evidence</b><span>{coverage.totalEvidence}件</span></div>
              <div><b>Natural Episode</b><span>{coverage.naturalEpisodeCount}件</span></div>
              <div><b>Feedback loop</b><span>{coverage.hasFeedbackLoop ? "あり" : "未形成"}</span></div>
              <div><b>Model snapshots</b><span>{coverage.modelSnapshots}件</span></div>
              <div><b>State-Dynamics</b><span>{coverage.stateDynamicsCases}件</span></div>
            </div>
          </article>

          <ResultCard title="暫定認知仮説（Legacy）" body={analysis.report} />
          <ResultCard title="暫定 自分取説" body={analysis.manual} />
          <ResultCard title="暫定 対人説明" body={analysis.interpersonal} />
          <ResultCard title="暫定 勉強・仕事モード" body={analysis.workMode} />

          <article className="panel-card warning-card">
            <h3>境界条件</h3>
            <p>心理検査だけで人格を固定しません。一時状態と比較的安定した特性を分け、自然Episode・反証・Prediction Error・Feedbackで更新します。</p>
          </article>
        </section>
      ) : null}

      {view === "kernel" ? (
        <AlgorithmKernelPanel
          state={theoryState}
          domainOptions={domainOptions}
          onMoveToDecision={(seed) => {
            setKernelDecisionSeed(seed);
            setView("decision");
          }}
        />
      ) : null}

      {view === "decision" ? (
        <DecisionLoopPanel
          state={theoryState}
          domainOptions={domainOptions}
          seed={kernelDecisionSeed}
          onSeedConsumed={() => setKernelDecisionSeed(null)}
          onChange={(next, message) => {
            setTheoryState(next);
            persist(message, { theoryOverride: next, viewOverride: "decision" });
          }}
        />
      ) : null}

      {view === "modelops" ? (
        <ModelOpsPanel
          state={theoryState}
          domainOptions={domainOptions}
          onChange={(next, message) => {
            setTheoryState(next);
            persist(message, { theoryOverride: next, viewOverride: "modelops" });
          }}
        />
      ) : null}

      {view === "log" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Naturalistic Evidence</p>
                <h2>自然Episodeを追加</h2>
              </div>
              <span className="status-chip">{coverage.naturalEpisodeCount}件</span>
            </div>
            <p>一回の出来事を人格へ変換せず、条件・行動・結果を分けて保存します。空欄があっても構いません。</p>

            <label>領域
              <select value={episodeDomain} onChange={(event) => setEpisodeDomain(event.target.value as EvidenceDomain)}>
                {domainOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>何が起きたか<textarea value={episodeSummary} onChange={(event) => setEpisodeSummary(event.target.value)} placeholder="観察できた出来事・違和感・反応" /></label>
            <label>条件・状態<textarea value={episodeContext} onChange={(event) => setEpisodeContext(event.target.value)} placeholder="睡眠、疲労、環境、相手、目的、負荷、直前の出来事など" /></label>
            <label>取った行動<textarea value={episodeAction} onChange={(event) => setEpisodeAction(event.target.value)} placeholder="何をした／しなかった" /></label>
            <label>結果<textarea value={episodeOutcome} onChange={(event) => setEpisodeOutcome(event.target.value)} placeholder="その後どうなった" /></label>
            <label>Feedback / 気づき<textarea value={episodeFeedback} onChange={(event) => setEpisodeFeedback(event.target.value)} placeholder="予想との差、次回変えたいこと、反証候補" /></label>
            <button type="button" className="primary-button" onClick={addNaturalEpisode}>Evidenceとして保存</button>
          </article>

          <article className="panel-card">
            <h2>保存済みEvidence</h2>
            <p>自然Episodeは個別編集・削除できます。Assessmentは入力画面から更新します。</p>
          </article>
          <EvidenceManager
            state={theoryState}
            domainLabel={(value) => domainOptions.find((option) => option.value === value)?.label || value}
            onChange={(next, message) => {
              setTheoryState(next);
              persist(message, { theoryOverride: next, viewOverride: "log" });
            }}
          />

          <article className="panel-card">
            <h2>旧形式メモ</h2>
            <p>v0.2互換の自由記述欄です。構造化Evidenceへの移行中も内容を失わないため残しています。</p>
            <textarea className="large-textarea" value={timeline} onChange={(event) => setTimeline(event.target.value)} />
            <button type="button" className="secondary-button" onClick={() => persist("旧形式メモを保存しました。")}>旧形式メモを保存</button>
          </article>
        </section>
      ) : null}

      {view === "settings" ? (
        <section className="screen-stack">
          <article className="panel-card">
            <h2>設定・Theory・データ管理</h2>
            <div className="settings-list">
              <div><b>保存方式</b><span>LocalStorage schema v2 / app v0.6 extension</span></div>
              <div><b>Theory Spec</b><span>{THEORY_SPEC_VERSION}</span></div>
              <div><b>App model</b><span>{APP_MODEL_VERSION}</span></div>
              <div><b>Authority</b><span>Canonical / Derived / Legacy 分離</span></div>
              <div><b>OCR</b><span>Evidence Adapterとして後段</span></div>
              <div><b>セルフチェック</b><span>Self-report Adapterとして後段</span></div>
              <div><b>Decision Loop</b><span>Prediction Freeze / Outcome / Validation</span></div>
              <div><b>Calibration</b><span>MATCH / PARTIAL / MISS / NOT TESTABLE</span></div>
              <div><b>Model History</b><span>Snapshot対応</span></div>
              <div><b>State-Dynamics</b><span>Derived / Freeze + Validation</span></div>
              <div><b>Algorithm Kernel</b><span>Derived / Self Manual Signals / Evidence-cutoff Handoff</span></div>
              <div><b>Pilot Metrics</b><span>Derived / Decision Cost / Regret / Error Attribution</span></div>
              <div><b>AI API</b><span>Coreでは未使用。Adapter層で追加可能</span></div>
            </div>
            <button type="button" className="primary-button" onClick={() => persist("保存しました。")}>現在の内容を保存</button>
            <button type="button" className="secondary-button" onClick={exportBackup}>バックアップJSONを書き出す</button>
            <label>バックアップJSONを読み込む<input type="file" accept="application/json,.json" onChange={importBackup} /></label>
            <button type="button" className="danger-button" onClick={clearAll}>同意・入力・Evidence・保存データを全削除</button>
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

function syncTheoryFromLegacyOutputs(
  base: TheorySyncState,
  scores: Scores,
  analysis: ReturnType<typeof analyze>
): TheorySyncState {
  const withAssessment = upsertAssessmentEvidence(base, scores);
  const assessmentEvidence = withAssessment.evidence.filter((item) => item.source === "assessment");
  const withoutLegacy = withAssessment.hypotheses.filter((item) => item.id !== "legacy-rule-based-pattern");

  if (!assessmentEvidence.length) {
    return { ...withAssessment, hypotheses: withoutLegacy };
  }

  const legacy = makeLegacyHypothesis({
    title: analysis.type,
    statement: analysis.report,
    evidenceIds: assessmentEvidence.map((item) => item.id),
    conditions: ["心理検査結果を主入力とする旧v0.2ルール", "自然Episodeによる検証前"]
  });

  return {
    ...withAssessment,
    hypotheses: [legacy, ...withoutLegacy]
  };
}

function ResultCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="panel-card result-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
