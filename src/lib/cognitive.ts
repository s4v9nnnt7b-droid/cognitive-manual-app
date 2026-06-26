export type Scores = {
  testName: string;
  testDate: string;
  fiq: string;
  viq: string;
  piq: string;
  vc: string;
  po: string;
  wm: string;
  ps: string;
  memo: string;
};

export type Analysis = {
  type: string;
  strength: string;
  load: string;
  expression: "normal" | "thinking" | "focus" | "tired" | "relief" | "celebrate";
  oneLine: string;
  summary: string;
  report: string;
  manual: string;
  interpersonal: string;
  workMode: string;
};

export const defaultScores: Scores = {
  testName: "不明な検査",
  testDate: "",
  fiq: "112",
  viq: "100",
  piq: "125",
  vc: "102",
  po: "114",
  wm: "88",
  ps: "137",
  memo: "匿名サンプル。実データはGitHubに入れない。"
};

function n(value: string): number {
  return Number(value || 0);
}

function label(score: number): string {
  if (!score) return "未入力";
  if (score >= 130) return "非常に高い";
  if (score >= 120) return "高い";
  if (score >= 110) return "やや高い";
  if (score >= 90) return "平均域";
  if (score >= 80) return "やや低め";
  return "低め";
}

export function validateScores(scores: Scores): string[] {
  const errors: string[] = [];
  const keys: Array<keyof Scores> = ["fiq", "viq", "piq", "vc", "po", "wm", "ps"];
  const allEmpty = keys.every((key) => scores[key].trim() === "");

  if (allEmpty) errors.push("少なくとも1つの指数を入力してください。");

  for (const key of keys) {
    const raw = scores[key].trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 200) {
      errors.push(`${key.toUpperCase()} は0〜200の範囲で入力してください。`);
    }
  }

  return errors;
}

export function analyze(scores: Scores): Analysis {
  const fiq = n(scores.fiq);
  const viq = n(scores.viq);
  const piq = n(scores.piq);
  const vc = n(scores.vc);
  const po = n(scores.po);
  const wm = n(scores.wm);
  const ps = n(scores.ps);
  const piqViq = piq && viq ? piq - viq : 0;
  const psWm = ps && wm ? ps - wm : 0;

  const highPS = ps >= 130;
  const highVisual = piq >= 120 || po >= 110;
  const lowWM = wm > 0 && wm <= 90;
  const languageStable = vc >= 90 && vc <= 109;

  let type = "バランス観察型";
  if (highPS && highVisual && lowWM) type = "高速処理・視覚直感型";
  else if (highPS && lowWM) type = "高速処理・外部メモ必須型";
  else if (highVisual) type = "視覚理解・構造把握型";
  else if (languageStable) type = "言語安定・構造化型";

  const strength = highPS ? "処理速度" : highVisual ? "視覚理解" : "構造化";
  const load = psWm >= 35 ? "高" : psWm >= 20 ? "中" : "低";
  const expression: Analysis["expression"] = load === "高" ? "thinking" : highPS ? "focus" : "normal";

  return {
    type,
    strength,
    load,
    expression,
    oneLine: `${type}。強みは${strength}。負荷は${load}め。`,
    summary: `FIQ ${fiq || "未入力"}、VIQ ${viq || "未入力"}、PIQ ${piq || "未入力"}、VC ${label(vc)}、PO ${label(po)}、WM ${label(wm)}、PS ${label(ps)}。PIQ−VIQは${piqViq}、PS−WMは${psWm}です。`,
    report: `あなたは、頭の中だけで長く保持して順番に処理するより、見える形・体感・直感で構造をつかむ方が力を出しやすい傾向があります。処理速度や視覚的な把握が強みになりやすい一方、未整理の情報を同時に抱えるとワーキングメモリに負荷が乗りやすい構造です。これは医療診断ではなく、生活で使うための自己理解メモです。`,
    manual: `動かすコツは、最初に全体像を図・表・カードにして外へ出すことです。長文を頭の中だけで整理しようとせず、選択肢を3つ以内にし、今日やることを1件に絞ると進みやすくなります。詰まったら、努力量ではなく情報の置き方を変えるのが先です。`,
    interpersonal: `周囲には「理解が遅いのではなく、情報を見える形にすると速い」と伝えるのが有効です。長い口頭指示より、箇条書き・図・チェックリストがあると力を出しやすいです。急な変更や曖昧な依頼では負荷が上がるため、目的・期限・選択肢を短く示してもらうと動きやすくなります。`,
    workMode: `勉強・仕事では、最初に全体マップを作り、次に1テーマずつ処理する流れが合いやすいです。高速に処理できる時間帯はアウトプット、疲れている時間帯は整理・確認・復習に回すと安定します。見える化、短時間区切り、外部メモ、環境調整が重要です。`
  };
}
