"use client";

import { useEffect, useMemo, useState } from "react";
import type { KernelDecisionSeed } from "@/src/lib/algorithm-kernel";
import type {
  ConfidenceBand,
  DecisionCase,
  DecisionMethod,
  ErrorAttributionCategory,
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

const errorCategories: Array<{ value: ErrorAttributionCategory; label: string }> = [
  { value: "representation", label: "Representation / Eφ" },
  { value: "common-engine", label: "Common Engine / ET" },
  { value: "prediction", label: "Prediction / EP" },
  { value: "utility", label: "Utility / EU" },
  { value: "decision-policy", label: "Decision Policy / Eδ" },
  { value: "environment", label: "Environment / Eenv" },
  { value: "insufficient-evidence", label: "Evidence不足" },
  { value: "mixed", label: "Mixed" },
  { value: "unknown", label: "Unknown" }
];

function optionalNumber(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : undefined;
}

export function DecisionLoopPanel({ state, domainOptions, seed, onSeedConsumed, onChange }: Props) {
  const [domain, setDomain] = useState<EvidenceDomain>("decision");
  const [goal, setGoal] = useState("");
  const [constraintsText, setConstraintsText] = useState("");
  const [prediction, setPrediction] = useState("");
  const [falsification, setFalsification] = useState("");
  const [utilityNote, setUtilityNote] = useState("");
  const [decision, setDecision] = useState("");
  const [uncertainty, setUncertainty] = useState<ConfidenceBand>("provisional");
  const [decisionMethod, setDecisionMethod] = useState<DecisionMethod>("intuitive");
  const [decisionTimeMinutes, setDecisionTimeMinutes] = useState("");
  const [cognitiveLoad, setCognitiveLoad] = useState("");
  const [informationCost, setInformationCost] = useState("");
  const [outcomeDrafts, setOutcomeDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [validationDrafts, setValidationDrafts] = useState<Record<string, ValidationStatus>>({});
  const [outcomeRegretDrafts, setOutcomeRegretDrafts] = useState<Record<string, string>>({});
  const [processRegretDrafts, setProcessRegretDrafts] = useState<Record<string, string>>({});
  const [processQualityDrafts, setProcessQualityDrafts] = useState<Record<string, string>>({});
  const [reversalDrafts, setReversalDrafts] = useState<Record<string, string>>({});
  const [errorCategoryDrafts, setErrorCategoryDrafts] = useState<Record<string, ErrorAttributionCategory[]>>({});
  const [errorNoteDrafts, setErrorNoteDrafts] = useState<Record<string, string>>({});

  const cases = useMemo(
    () => [...state.decisionCases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.decisionCases]
  );

  useEffect(() => {
    if (!seed) return;
    setDomain(seed.domain);
    setGoal(seed.goal);
    setConstraintsText(seed.constraints.join("\n"));
    setDecisionMethod("kernel-assisted");
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
      pilot: {
        pre: {
          method: seed ? "kernel-assisted" : decisionMethod,
          decisionTimeMinutes: optionalNumber(decisionTimeMinutes),
          cognitiveLoad: optionalNumber(cognitiveLoad),
          informationCost: optionalNumber(informationCost)
        }
      },
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
    setDecisionMethod("intuitive");
    setDecisionTimeMinutes("");
    setCognitiveLoad("");
    setInformationCost("");
    onSeedConsumed?.();
  }

  function closeCase(item: DecisionCase) {
    const outcome = (outcomeDrafts[item.id] || "").trim();
    const validation = validationDrafts[item.id];
    if (!outcome || !validation) return;
    const now = new Date().toISOString();
    const selectedCategories = errorCategoryDrafts[item.id] || [];
    const needsAttribution = validation === "partial" || validation === "miss" || validation === "not-testable";
    const categories: ErrorAttributionCategory[] = selectedCategories.length
      ? selectedCategories
      : needsAttribution
        ? [validation === "not-testable" ? "insufficient-evidence" : "unknown"]
        : [];
    const reversalValue = reversalDrafts[item.id];
    const updated: DecisionCase = {
      ...item,
      outcome,
      feedback: (feedbackDrafts[item.id] || "").trim() || undefined,
      pilot: {
        ...item.pilot,
        post: {
          outcomeRegret: optionalNumber(outcomeRegretDrafts[item.id] || ""),
          processRegret: optionalNumber(processRegretDrafts[item.id] || ""),
          processQuality: optionalNumber(processQualityDrafts[item.id] || ""),
          reversalNeeded: reversalValue === "yes" ? true : reversalValue === "no" ? false : undefined
        },
        errorAttribution: categories.length ? {
          categories,
          note: (errorNoteDrafts[item.id] || "").trim() || undefined,
          attributedAt: now
        } : undefined
      },
      outcomeObservedAt: now,
      validatedAt: now,
      validation
    };
    const next = state.decisionCases.map((current) => current.id === item.id ? updated : current);
    onChange({ ...state, decisionCases: next }, `Decision Caseを${validation.toUpperCase()}で確定しました。`);
  }

  function toggleErrorCategory(caseId: string, category: ErrorAttributionCategory) {
    setErrorCategoryDrafts((current) => {
      const selected = current[caseId] || [];
      return {
        ...current,
        [caseId]: selected.includes(category)
          ? selected.filter((item) => item !== category)
          : [...selected, category]
      };
    });
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

        <div className="pilot-metrics-box">
          <div><b>Pilot Metrics / Freeze前</b><small>1〜5は科学的尺度ではなく、同じ本人内で比較する運用指標です。</small></div>
          <label>判断方法
            <select value={seed ? "kernel-assisted" : decisionMethod} disabled={Boolean(seed)} onChange={(e) => setDecisionMethod(e.target.value as DecisionMethod)}>
              <option value="kernel-assisted">Kernel-assisted</option>
              <option value="intuitive">Intuitive</option>
              <option value="pros-cons">Pros / Cons</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div className="compact-grid">
            <label>判断時間（分）<input inputMode="decimal" type="number" min="0" value={decisionTimeMinutes} onChange={(e) => setDecisionTimeMinutes(e.target.value)} placeholder="任意" /></label>
            <ScaleInput label="認知負荷 1–5" value={cognitiveLoad} onChange={setCognitiveLoad} />
            <ScaleInput label="情報収集コスト 1–5" value={informationCost} onChange={setInformationCost} />
          </div>
        </div>

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
              <div><b>Method</b><span>{item.pilot?.pre?.method || "未記録"}</span></div>
              <div><b>Decision cost</b><span>{item.pilot?.pre ? `${item.pilot.pre.decisionTimeMinutes ?? "-"}分 / Load ${item.pilot.pre.cognitiveLoad ?? "-"} / Info ${item.pilot.pre.informationCost ?? "-"}` : "未記録"}</span></div>
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

                <div className="pilot-metrics-box">
                  <div><b>Pilot Metrics / Outcome後</b><small>結果の良し悪しと、判断プロセスの良し悪しを分離して記録します。</small></div>
                  <div className="compact-grid">
                    <ScaleInput label="Outcome Regret 1–5" value={outcomeRegretDrafts[item.id] || ""} onChange={(value) => setOutcomeRegretDrafts((current) => ({ ...current, [item.id]: value }))} />
                    <ScaleInput label="Process Regret 1–5" value={processRegretDrafts[item.id] || ""} onChange={(value) => setProcessRegretDrafts((current) => ({ ...current, [item.id]: value }))} />
                    <ScaleInput label="Process Quality 1–5" value={processQualityDrafts[item.id] || ""} onChange={(value) => setProcessQualityDrafts((current) => ({ ...current, [item.id]: value }))} />
                    <label>判断をやり直したいか
                      <select value={reversalDrafts[item.id] || ""} onChange={(e) => setReversalDrafts((current) => ({ ...current, [item.id]: e.target.value }))}>
                        <option value="">未選択</option>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="pilot-metrics-box">
                  <div><b>Error Attribution</b><small>複数選択可。無理に単一原因へ決めず、Mixed / Unknownを正規状態として使います。</small></div>
                  <div className="error-attribution-grid">
                    {errorCategories.map((category) => (
                      <label key={category.value} className="error-attribution-option">
                        <input
                          type="checkbox"
                          checked={(errorCategoryDrafts[item.id] || []).includes(category.value)}
                          onChange={() => toggleErrorCategory(item.id, category.value)}
                        />
                        <span>{category.label}</span>
                      </label>
                    ))}
                  </div>
                  <label>帰属メモ<textarea value={errorNoteDrafts[item.id] || ""} onChange={(e) => setErrorNoteDrafts((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="なぜこの原因候補と考えたか。後付けで『当たり』にしない。" /></label>
                </div>

                <button type="button" className="primary-button" disabled={!(outcomeDrafts[item.id] || "").trim() || !validationDrafts[item.id]} onClick={() => closeCase(item)}>
                  Outcomeを確定してValidation
                </button>
              </>
            ) : (
              <div className="settings-list">
                <div><b>Outcome</b><span>{item.outcome || "未記録"}</span></div>
                <div><b>Feedback</b><span>{item.feedback || "なし"}</span></div>
                <div><b>Outcome metrics</b><span>{item.pilot?.post ? `Outcome regret ${item.pilot.post.outcomeRegret ?? "-"} / Process regret ${item.pilot.post.processRegret ?? "-"} / Quality ${item.pilot.post.processQuality ?? "-"} / Reversal ${item.pilot.post.reversalNeeded === undefined ? "-" : item.pilot.post.reversalNeeded ? "YES" : "NO"}` : "未記録"}</span></div>
                <div><b>Error attribution</b><span>{item.pilot?.errorAttribution?.categories.join(" / ") || "なし"}</span></div>
                <div><b>Validated</b><span>{item.validatedAt || "-"}</span></div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ScaleInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>{label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">未入力</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </label>
  );
}
