"use client";

import { useEffect, useMemo, useState } from "react";
import type { KernelDecisionSeed } from "@/src/lib/algorithm-kernel";
import type {
  ConfidenceBand,
  DecisionCase,
  EvidenceDomain,
  TheorySyncState,
  ValidationStatus
} from "@/src/lib/theory";

type Props = {
  state: TheorySyncState;
  domainOptions: Array<{ value: EvidenceDomain; label: string }>;
  seed?: KernelDecisionSeed | null;
  onSeedConsumed?: () => void;
  onChange: (next: TheorySyncState, message: string) => void;
};

const validationOptions: Array<{ value: ValidationStatus; label: string }> = [
  { value: "match", label: "MATCH" },
  { value: "partial", label: "PARTIAL" },
  { value: "miss", label: "MISS" },
  { value: "not-testable", label: "NOT TESTABLE" }
];

export function DecisionLoopPanel({ state, domainOptions, seed, onSeedConsumed, onChange }: Props) {
  const [domain, setDomain] = useState<EvidenceDomain>("decision");
  const [goal, setGoal] = useState("");
  const [constraintsText, setConstraintsText] = useState("");
  const [prediction, setPrediction] = useState("");
  const [falsification, setFalsification] = useState("");
  const [utilityNote, setUtilityNote] = useState("");
  const [decision, setDecision] = useState("");
  const [uncertainty, setUncertainty] = useState<ConfidenceBand>("provisional");
  const [outcomeDrafts, setOutcomeDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [validationDrafts, setValidationDrafts] = useState<Record<string, ValidationStatus>>({});

  const cases = useMemo(
    () => [...state.decisionCases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.decisionCases]
  );

  useEffect(() => {
    if (!seed) return;
    setDomain(seed.domain);
    setGoal(seed.goal);
    setConstraintsText(seed.constraints.join("\n"));
  }, [seed]);

  function freezePrediction() {
    if (!goal.trim() || !prediction.trim() || !decision.trim()) return;
    const now = new Date().toISOString();
    const evidenceIds = seed?.evidenceIds || state.evidence
      .filter((item) => item.domain === domain || item.domain === "general")
      .map((item) => item.id);

    const item: DecisionCase = {
      id: `decision-${Date.now()}`,
      domain,
      createdAt: now,
      predictionFrozenAt: now,
      evidenceIds,
      goal: goal.trim(),
      constraints: constraintsText.split("\n").map((v) => v.trim()).filter(Boolean),
      prediction: prediction.trim(),
      falsificationConditions: falsification.split("\n").map((v) => v.trim()).filter(Boolean),
      uncertainty,
      utilityNote: utilityNote.trim() || undefined,
      decision: decision.trim(),
      derivedFrom: seed ? {
        kind: "algorithm-kernel",
        id: seed.kernelSpecId,
        version: seed.generatorVersion
      } : undefined,
      validation: "pending"
    };

    onChange({ ...state, decisionCases: [item, ...state.decisionCases] }, "PredictionをOutcome前にFreezeしました。");
    setGoal("");
    setConstraintsText("");
    setPrediction("");
    setFalsification("");
    setUtilityNote("");
    setDecision("");
    setUncertainty("provisional");
    onSeedConsumed?.();
  }

  function closeCase(item: DecisionCase) {
    const outcome = (outcomeDrafts[item.id] || "").trim();
    const validation = validationDrafts[item.id];
    if (!outcome || !validation) return;
    const now = new Date().toISOString();
    const updated: DecisionCase = {
      ...item,
      outcome,
      feedback: (feedbackDrafts[item.id] || "").trim() || undefined,
      outcomeObservedAt: now,
      validatedAt: now,
      validation
    };
    const next = state.decisionCases.map((current) => current.id === item.id ? updated : current);
    onChange({ ...state, decisionCases: next }, `Decision Caseを${validation.toUpperCase()}で確定しました。`);
  }

  return (
    <section className="screen-stack">
      <article className="panel-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Prospective Decision Loop</p>
            <h2>Prediction Freeze</h2>
          </div>
          <span className="status-chip">{state.decisionCases.length} cases</span>
        </div>
        <p>Outcomeを見る前に予測・判断・反証条件を固定します。保存後はこのCaseのPredictionを編集しません。</p>
        {seed ? (
          <div className="kernel-handoff">
            <b>Algorithm Kernelから引き継ぎ</b>
            <span>{seed.generatorVersion} / Evidence cutoff {seed.evidenceIds.length}件</span>
            <small>Domain・Goal・Constraintsは引き継ぎ済み。Prediction / Utility / Decisionはここで明示してからFreezeします。</small>
          </div>
        ) : null}

        <label>領域
          <select value={domain} onChange={(e) => setDomain(e.target.value as EvidenceDomain)}>
            {domainOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Goal<textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="今回、何を最大化・達成したいか" /></label>
        <label>Constraints<textarea value={constraintsText} onChange={(e) => setConstraintsText(e.target.value)} placeholder="1行1条件。時間、予算、安全、不可逆性など" /></label>
        <label>Prediction<textarea value={prediction} onChange={(e) => setPrediction(e.target.value)} placeholder="このActionを選ぶと何が起こりそうか" /></label>
        <label>Falsification conditions<textarea value={falsification} onChange={(e) => setFalsification(e.target.value)} placeholder="何が起きたらこの予測は外れたとみなすか" /></label>
        <label>Utility / 判断基準<textarea value={utilityNote} onChange={(e) => setUtilityNote(e.target.value)} placeholder="そのOutcomeをどう評価するか。PredictionとPreferenceを分ける" /></label>
        <label>Decision<textarea value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="実際に選ぶAction" /></label>
        <label>Uncertainty
          <select value={uncertainty} onChange={(e) => setUncertainty(e.target.value as ConfidenceBand)}>
            <option value="low">low</option>
            <option value="provisional">provisional</option>
            <option value="moderate">moderate</option>
            <option value="conditional-high">conditional-high</option>
          </select>
        </label>
        <button type="button" className="primary-button" disabled={!goal.trim() || !prediction.trim() || !decision.trim()} onClick={freezePrediction}>
          PredictionをFreeze
        </button>
      </article>

      {cases.map((item) => {
        const label = domainOptions.find((option) => option.value === item.domain)?.label || item.domain;
        const frozen = item.validation === "pending";
        return (
          <article className="panel-card" key={item.id}>
            <div className="section-head">
              <div>
                <p className="eyebrow">{label} / {item.validation.toUpperCase()}</p>
                <h3>{item.goal || "Decision Case"}</h3>
              </div>
              <span className="status-chip">{item.uncertainty || "provisional"}</span>
            </div>
            <div className="settings-list">
              <div><b>Prediction</b><span>{item.prediction || "未記録"}</span></div>
              <div><b>Decision</b><span>{item.decision || "未記録"}</span></div>
              <div><b>Evidence cutoff</b><span>{item.evidenceIds.length}件</span></div>
              <div><b>Source</b><span>{item.derivedFrom ? `${item.derivedFrom.version} / ${item.derivedFrom.id}` : "manual"}</span></div>
              <div><b>Frozen</b><span>{item.predictionFrozenAt || item.createdAt}</span></div>
            </div>
            {item.falsificationConditions?.length ? (
              <p className="hint-text">反証条件：{item.falsificationConditions.join(" / ")}</p>
            ) : null}

            {frozen ? (
              <>
                <label>Outcome<textarea value={outcomeDrafts[item.id] || ""} onChange={(e) => setOutcomeDrafts((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="Prediction Freeze後に実際に起きたこと" /></label>
                <label>Feedback / Prediction Error<textarea value={feedbackDrafts[item.id] || ""} onChange={(e) => setFeedbackDrafts((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="どこが合い、どこが外れたか" /></label>
                <label>Validation
                  <select value={validationDrafts[item.id] || ""} onChange={(e) => setValidationDrafts((current) => ({ ...current, [item.id]: e.target.value as ValidationStatus }))}>
                    <option value="">未選択</option>
                    {validationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <button type="button" className="primary-button" disabled={!(outcomeDrafts[item.id] || "").trim() || !validationDrafts[item.id]} onClick={() => closeCase(item)}>
                  Outcomeを確定してValidation
                </button>
              </>
            ) : (
              <div className="settings-list">
                <div><b>Outcome</b><span>{item.outcome || "未記録"}</span></div>
                <div><b>Feedback</b><span>{item.feedback || "なし"}</span></div>
                <div><b>Validated</b><span>{item.validatedAt || "-"}</span></div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
