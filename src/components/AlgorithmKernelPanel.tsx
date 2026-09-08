"use client";

import { useMemo, useState } from "react";
import {
  ALGORITHM_KERNEL_VERSION,
  generateAlgorithmKernelSpec,
  inspectDomainReadiness,
  type AlgorithmKernelSpec
} from "@/src/lib/algorithm-kernel";
import type { EvidenceDomain, TheorySyncState } from "@/src/lib/theory";

type Props = {
  state: TheorySyncState;
  domainOptions: Array<{ value: EvidenceDomain; label: string }>;
  onMoveToDecision: () => void;
};

export function AlgorithmKernelPanel({ state, domainOptions, onMoveToDecision }: Props) {
  const [domain, setDomain] = useState<EvidenceDomain>("study");
  const [goal, setGoal] = useState("");
  const [constraintsText, setConstraintsText] = useState("");
  const [spec, setSpec] = useState<AlgorithmKernelSpec | null>(null);

  const readiness = useMemo(
    () => inspectDomainReadiness(state, domain, goal),
    [state, domain, goal]
  );

  function buildSpec() {
    setSpec(generateAlgorithmKernelSpec({
      state,
      domain,
      goal,
      constraints: constraintsText.split("\n")
    }));
  }

  const domainLabel = domainOptions.find((item) => item.value === domain)?.label || domain;

  return (
    <section className="screen-stack">
      <article className="panel-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Theory → Algorithm Generator</p>
            <h2>Algorithm Kernel Bridge</h2>
          </div>
          <span className="status-chip">DERIVED v0.1</span>
        </div>
        <p>
          根源理論の共通処理骨格を、Domain固有のDecision Architectureへ変換する入口です。
          ここでは自動決定せず、Evidence不足ならFail-Closedします。
        </p>

        <div className="settings-list">
          <div><b>Kernel</b><span>{ALGORITHM_KERNEL_VERSION}</span></div>
          <div><b>Authority</b><span>Derived / Canonical unchanged</span></div>
          <div><b>Pipeline</b><span>Evidence → Representation → Prediction → Utility → Decision → Validation</span></div>
        </div>

        <label>Domain
          <select value={domain} onChange={(event) => { setDomain(event.target.value as EvidenceDomain); setSpec(null); }}>
            {domainOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Goal
          <textarea value={goal} onChange={(event) => { setGoal(event.target.value); setSpec(null); }} placeholder="今回は何を最大化・達成したいか" />
        </label>
        <label>Hard Constraints / 制約
          <textarea value={constraintsText} onChange={(event) => { setConstraintsText(event.target.value); setSpec(null); }} placeholder="1行1条件。時間・予算・安全・不可逆性など" />
        </label>

        <div className="settings-list">
          <div><b>Relevant Evidence</b><span>{readiness.evidenceCount}件</span></div>
          <div><b>Natural Episode</b><span>{readiness.naturalEpisodeCount}件</span></div>
          <div><b>Outcome/Feedback付き</b><span>{readiness.outcomeEvidenceCount}件</span></div>
          <div><b>Completed Decision</b><span>{readiness.completedDecisionCount}件</span></div>
          <div><b>Readiness</b><span>{readiness.readiness.toUpperCase()}</span></div>
        </div>
        <p className="hint-text">{readiness.reasons.join(" / ")}</p>

        <button type="button" className="primary-button" onClick={buildSpec}>
          Domain Algorithm Draftを生成
        </button>
      </article>

      {spec ? (
        <article className="panel-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">{domainLabel} / {spec.readiness.toUpperCase()}</p>
              <h3>{spec.goal || "Goal未定義"}</h3>
            </div>
            <span className="status-chip">{spec.nextAction}</span>
          </div>

          <KernelContract title="1. Representation φ_d" items={spec.representationContract} />
          <KernelContract title="2. Prediction P_d" items={spec.predictionContract} />
          <KernelContract title="3. Utility U_d" items={spec.utilityContract} />
          <KernelContract title="4. Decision δ_d" items={spec.decisionContract} />
          <KernelContract title="5. Validation 𝒱_d" items={spec.validationContract} />
          <KernelContract title="Guardrails" items={spec.guardrails} />

          <div className="settings-list">
            <div><b>Evidence cutoff</b><span>{spec.evidenceCount}件</span></div>
            <div><b>Generated</b><span>{spec.createdAt}</span></div>
            <div><b>Next</b><span>{spec.nextAction}</span></div>
          </div>

          {spec.nextAction === "LOW_RISK_PILOT" ? (
            <button type="button" className="primary-button" onClick={onMoveToDecision}>
              Decision CaseでPredictionをFreezeする
            </button>
          ) : (
            <p className="hint-text">
              今は自動的にDecisionへ進めません。Evidence追加または条件整理後に再生成します。
            </p>
          )}
        </article>
      ) : null}
    </section>
  );
}

function KernelContract({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <div className="kernel-list">
        {items.map((item) => <div key={item}>{item}</div>)}
      </div>
    </section>
  );
}
