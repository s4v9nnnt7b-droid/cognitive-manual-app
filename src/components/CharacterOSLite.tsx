import type { Analysis } from "@/src/lib/cognitive";

const faceMap: Record<Analysis["expression"], string> = {
  normal: "😊",
  thinking: "🤔",
  focus: "🧠",
  tired: "😟",
  relief: "😌",
  celebrate: "🎉"
};

export function CharacterOSLite({ analysis }: { analysis: Analysis }) {
  return (
    <section className="character-card" aria-label="Character OS Lite">
      <div className="character-face" aria-hidden="true">{faceMap[analysis.expression]}</div>
      <div>
        <p className="eyebrow">Character OS Lite</p>
        <h2>{analysis.type}</h2>
        <p>{analysis.oneLine}</p>
        <span className="status-pill">今日のひとこと：見える形にすれば、もう半分進んでるで。</span>
      </div>
    </section>
  );
}
