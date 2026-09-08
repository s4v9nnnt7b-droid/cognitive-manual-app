"use client";

import { useMemo, useState } from "react";
import {
  calibrationSummary,
  createModelSnapshot,
  type Direction,
  type EvidenceDomain,
  type StateDynamicsAction,
  type StateDynamicsCase,
  type StateDynamicsLevel,
  type TheorySyncState,
  type ValidationStatus
} from "@/src/lib/theory";

type Props = {
  state: TheorySyncState;
  domainOptions: Array<{ value: EvidenceDomain; label: string }>;
  onChange: (next: TheorySyncState, message: string) => void;
};

const levels: StateDynamicsLevel[] = ["low", "mid", "high", "unknown"];
const directions: Direction[] = ["improve", "same", "worsen", "unclear"];
const validations: ValidationStatus[] = ["match", "partial", "miss", "not-testable"];

export function ModelOpsPanel({ state, domainOptions, onChange }: Props) {
  const calibration = useMemo(() => calibrationSummary(state), [state]);
  const [snapshotReason, setSnapshotReason] = useState("定点保存");
  const [domain, setDomain] = useState<EvidenceDomain>("general");
  const [action, setAction] = useState<StateDynamicsAction>("act");
  const [a, setA] = useState<StateDynamicsLevel>("unknown");
  const [r, setR] = useState<StateDynamicsLevel>("unknown");
  const [d, setD] = useState<StateDynamicsLevel>("unknown");
  const [c, setC] = useState<StateDynamicsLevel>("unknown");
  const [predictedDirection, setPredictedDirection] = useState<Direction>("unclear");
  const [note, setNote] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [actualDirections, setActualDirections] = useState<Record<string, Direction>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [validationDrafts, setValidationDrafts] = useState<Record<string, ValidationStatus>>({});

  const misses = state.decisionCases.filter((item) => item.validation === "miss");
  const kernelCases = state.decisionCases.filter((item) => item.derivedFrom?.kind === "algorithm-kernel");
  const kernelCompleted = kernelCases.filter((item) => item.validation !== "pending");
  const kernelAssessable = kernelCases.filter((item) => ["match", "partial", "miss"].includes(item.validation));
  const kernelMisses = kernelCases.filter((item) => item.validation === "miss");

  function saveSnapshot() {
    const snapshot = createModelSnapshot(state, snapshotReason.trim() || "定点保存");
    onChange({ ...state, modelSnapshots: [snapshot, ...state.modelSnapshots] }, "Model Snapshotを保存しました。");
  }

  function freezeStateDynamics() {
    const now = new Date().toISOString();
    const item: StateDynamicsCase = {
      id: `sd-${Date.now()}`,
      domain,
      createdAt: now,
      predictionFrozenAt: now,
      action,
      predictedA: a,
      predictedR: r,
      predictedD: d,
      predictedC: c,
      predictedDirection,
      note: note.trim() || undefined,
      validation: "pending"
    };
    onChange({ ...state, stateDynamicsCases: [item, ...state.stateDynamicsCases] }, "State-Dynamics予測をFreezeしました。");
    setNote("");
  }

  function closeStateDynamics(item: StateDynamicsCase) {
    const outcome = (outcomes[item.id] || "").trim();
    const actualDirection = actualDirections[item.id];
    const validation = validationDrafts[item.id];
    if (!outcome || !actualDirection || !validation) return;
    const updated: StateDynamicsCase = {
      ...item,
      outcome,
      actualDirection,
      feedback: (feedback[item.id] || "").trim() || undefined,
      validatedAt: new Date().toISOString(),
      validation
    };
    onChange({ ...state, stateDynamicsCases: state.stateDynamicsCases.map((x) => x.id === item.id ? updated : x) }, `State-Dynamicsを${validation.toUpperCase()}で確定しました。`);
  }

  return (
    <section className="screen-stack">
      <article className="panel-card">
        <div className="section-head"><div><p className="eyebrow">Calibration</p><h2>予測の当たり方</h2></div><span className="status-chip">{calibration.assessable} assessable</span></div>
        <div className="settings-list">
          <div><b>MATCH</b><span>{calibration.counts.match}</span></div>
          <div><b>PARTIAL</b><span>{calibration.counts.partial}</span></div>
          <div><b>MISS</b><span>{calibration.counts.miss}</span></div>
          <div><b>NOT TESTABLE</b><span>{calibration.counts["not-testable"]}</span></div>
          <div><b>Kernel-linked Cases</b><span>{kernelCompleted.length}/{kernelCases.length} completed</span></div>
          <div><b>Kernel assessable</b><span>{kernelAssessable.length}</span></div>
          <div><b>Kernel MISS</b><span>{kernelMisses.length}</span></div>
          <div><b>Calibration score</b><span>{calibration.calibrationScore === null ? "未計算" : `${Math.round(calibration.calibrationScore * 100)}%`}</span></div>
        </div>
        <p className="hint-text">スコアは MATCH=1 / PARTIAL=0.5 / MISS=0 の簡易運用指標。Theoryの真偽そのものではありません。</p>
      </article>

      <article className="panel-card">
        <div className="section-head"><div><p className="eyebrow">Counterexample Ledger</p><h2>外れを消さない</h2></div><span className="status-chip">{misses.length} MISS</span></div>
        {misses.length ? <div className="phase-list">{misses.map((item) => <button type="button" disabled key={item.id}><b>{item.domain} / {item.goal || "Decision Case"}</b><span>Source: {item.derivedFrom ? item.derivedFrom.version : "manual"}｜予測: {item.prediction || "-"}｜結果: {item.outcome || "-"}｜Feedback: {item.feedback || "-"}</span></button>)}</div> : <p>現在、確定済みMISSはありません。</p>}
      </article>

      <article className="panel-card">
        <div className="section-head"><div><p className="eyebrow">Model History</p><h2>Snapshot</h2></div><span className="status-chip">{state.modelSnapshots.length}</span></div>
        <label>保存理由<input value={snapshotReason} onChange={(e) => setSnapshotReason(e.target.value)} /></label>
        <button type="button" className="primary-button" onClick={saveSnapshot}>現在モデルをSnapshot</button>
        {state.modelSnapshots.length ? <div className="phase-list">{state.modelSnapshots.slice(0, 8).map((item, index) => { const older = state.modelSnapshots[index + 1]; const delta = older ? `ΔEvidence ${item.evidenceCount - older.evidenceCount >= 0 ? "+" : ""}${item.evidenceCount - older.evidenceCount} / ΔDecision ${item.decisionCaseCount - older.decisionCaseCount >= 0 ? "+" : ""}${item.decisionCaseCount - older.decisionCaseCount} / ΔMISS ${item.validationCounts.miss - older.validationCounts.miss >= 0 ? "+" : ""}${item.validationCounts.miss - older.validationCounts.miss}` : "初回Snapshot"; return <button type="button" disabled key={item.id}><b>{item.createdAt} / {item.reason}</b><span>Evidence {item.evidenceCount}｜Decision {item.decisionCaseCount}｜MISS {item.validationCounts.miss}｜{delta}</span></button>; })}</div> : <p>Snapshotはまだありません。</p>}
      </article>

      <article className="panel-card">
        <div className="section-head"><div><p className="eyebrow">Derived / State-Dynamics</p><h2>Act / Rest / Wait の予測</h2></div><span className="status-chip">NOT CANONICAL</span></div>
        <p>State-DynamicsはCanonical Root Theoryを変更せず、Predict→Act→Feedback部分の派生world-modelとして記録します。</p>
        <label>領域<select value={domain} onChange={(e) => setDomain(e.target.value as EvidenceDomain)}>{domainOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label>Action<select value={action} onChange={(e) => setAction(e.target.value as StateDynamicsAction)}><option value="act">Act</option><option value="rest">Rest</option><option value="wait">Wait</option><option value="change-environment">Change Environment</option></select></label>
        <div className="compact-grid">
          <Level label="Â 改善" value={a} onChange={setA} />
          <Level label="R̂ 回復" value={r} onChange={setR} />
          <Level label="D̂ 放置損失" value={d} onChange={setD} />
          <Level label="Ĉ 消耗" value={c} onChange={setC} />
        </div>
        <label>予測方向<select value={predictedDirection} onChange={(e) => setPredictedDirection(e.target.value as Direction)}>{directions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label>メモ<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="予測根拠・条件。実値ではなく事前の内部予測として記録" /></label>
        <button type="button" className="primary-button" onClick={freezeStateDynamics}>State-DynamicsをFreeze</button>
      </article>

      {state.stateDynamicsCases.map((item) => item.validation === "pending" ? (
        <article className="panel-card" key={item.id}>
          <p className="eyebrow">SD Pending / {item.domain}</p><h3>{item.action} → {item.predictedDirection}</h3>
          <p className="hint-text">Â {item.predictedA} / R̂ {item.predictedR} / D̂ {item.predictedD} / Ĉ {item.predictedC}｜Freeze {item.predictionFrozenAt}</p>
          <label>Outcome<textarea value={outcomes[item.id] || ""} onChange={(e) => setOutcomes((x) => ({ ...x, [item.id]: e.target.value }))} /></label>
          <label>実際の方向<select value={actualDirections[item.id] || ""} onChange={(e) => setActualDirections((x) => ({ ...x, [item.id]: e.target.value as Direction }))}><option value="">未選択</option>{directions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label>Prediction Error / Feedback<textarea value={feedback[item.id] || ""} onChange={(e) => setFeedback((x) => ({ ...x, [item.id]: e.target.value }))} /></label>
          <label>Validation<select value={validationDrafts[item.id] || ""} onChange={(e) => setValidationDrafts((x) => ({ ...x, [item.id]: e.target.value as ValidationStatus }))}><option value="">未選択</option>{validations.map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select></label>
          <button type="button" className="primary-button" onClick={() => closeStateDynamics(item)}>Outcomeを確定</button>
        </article>
      ) : null)}
    </section>
  );
}

function Level({ label, value, onChange }: { label: string; value: StateDynamicsLevel; onChange: (value: StateDynamicsLevel) => void }) {
  return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value as StateDynamicsLevel)}>{levels.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>;
}
