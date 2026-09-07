"use client";

import { useState } from "react";
import type { EvidenceItem, TheorySyncState } from "@/src/lib/theory";

type Props = {
  state: TheorySyncState;
  domainLabel: (value: string) => string;
  onChange: (next: TheorySyncState, message: string) => void;
};

export function EvidenceManager({ state, domainLabel, onChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EvidenceItem>>({});

  function begin(item: EvidenceItem) {
    setEditing(item.id);
    setDraft({ summary: item.summary, context: item.context || "", action: item.action || "", outcome: item.outcome || "", feedback: item.feedback || "" });
  }

  function save(item: EvidenceItem) {
    const summary = String(draft.summary || "").trim();
    if (!summary) return;
    const updated: EvidenceItem = {
      ...item,
      summary,
      context: String(draft.context || "").trim() || undefined,
      action: String(draft.action || "").trim() || undefined,
      outcome: String(draft.outcome || "").trim() || undefined,
      feedback: String(draft.feedback || "").trim() || undefined
    };
    onChange({ ...state, evidence: state.evidence.map((x) => x.id === item.id ? updated : x) }, "Evidenceを更新しました。");
    setEditing(null);
    setDraft({});
  }

  function remove(item: EvidenceItem) {
    const evidence = state.evidence.filter((x) => x.id !== item.id);
    const hypotheses = state.hypotheses.map((h) => ({
      ...h,
      supportingEvidenceIds: h.supportingEvidenceIds.filter((id) => id !== item.id),
      counterEvidenceIds: h.counterEvidenceIds.filter((id) => id !== item.id)
    }));
    onChange({ ...state, evidence, hypotheses }, "Evidenceを削除しました。");
  }

  if (!state.evidence.length) return <p>まだEvidenceはありません。</p>;

  return <div className="screen-stack">{state.evidence.map((item) => {
    const canMutate = item.source !== "assessment";
    const isEditing = editing === item.id;
    return <article className="panel-card" key={item.id}>
      <div className="section-head"><div><p className="eyebrow">{domainLabel(item.domain)} / {item.source}</p><h3>{item.summary}</h3></div><span className="status-chip">{item.confidence}</span></div>
      {isEditing ? <>
        <label>観察<textarea value={String(draft.summary || "")} onChange={(e) => setDraft((x) => ({ ...x, summary: e.target.value }))} /></label>
        <label>条件<textarea value={String(draft.context || "")} onChange={(e) => setDraft((x) => ({ ...x, context: e.target.value }))} /></label>
        <label>Action<textarea value={String(draft.action || "")} onChange={(e) => setDraft((x) => ({ ...x, action: e.target.value }))} /></label>
        <label>Outcome<textarea value={String(draft.outcome || "")} onChange={(e) => setDraft((x) => ({ ...x, outcome: e.target.value }))} /></label>
        <label>Feedback<textarea value={String(draft.feedback || "")} onChange={(e) => setDraft((x) => ({ ...x, feedback: e.target.value }))} /></label>
        <div className="button-row"><button className="primary-button" type="button" onClick={() => save(item)}>保存</button><button className="secondary-button" type="button" onClick={() => setEditing(null)}>取消</button></div>
      </> : <>
        <div className="settings-list">
          <div><b>Observed</b><span>{item.observedAt || "未記録"}</span></div>
          <div><b>Context</b><span>{item.context || "-"}</span></div>
          <div><b>Action</b><span>{item.action || "-"}</span></div>
          <div><b>Outcome</b><span>{item.outcome || "-"}</span></div>
          <div><b>Feedback</b><span>{item.feedback || "-"}</span></div>
        </div>
        {canMutate ? <div className="button-row"><button className="secondary-button" type="button" onClick={() => begin(item)}>編集</button><button className="danger-button compact-danger" type="button" onClick={() => remove(item)}>削除</button></div> : <p className="hint-text">Assessment Evidenceは心理検査入力画面から更新します。</p>}
      </>}
    </article>;
  })}</div>;
}
