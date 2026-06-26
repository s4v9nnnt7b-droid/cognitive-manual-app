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
  testName: "",
  testDate: "",
  fiq: "",
  viq: "",
  piq: "",
  vc: "",
  po: "",
  wm: "",
  ps: "",
  memo: ""
};

export const demoScores: Scores = {
  testName: "匿名サンプル検査",
  testDate: "",
  fiq: "108",
  viq: "101",
  piq: "116",
  vc: "103",
  po: "112",
  wm: "94",
  ps: "123",
  memo: "開発確認用の匿名サンプルです。実在個人の検査結果ではありません。"
};

export const scoreKeys = ["fiq", "viq", "piq", "vc", "po", "wm", "ps"] as const;
export type ScoreKey = (typeof scoreKeys)[number];

function n(value: string): number {
  return Number(value || 0);
}

function hasAnyScore(scores: Scores): boolean {
  return scoreKeys.some((key) => scores[key].trim() !== "");
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
  const allEmpty = scoreKeys.every((key) => scores[key].trim() === "");

  if (allEmpty) errors.push("少なくとも1つの指数を入力してください。");

  for (const key of scoreKeys) {
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
  if (!hasAnyScore(scores)) {
    return {
      type: "未登録",
      strength: "未入力",
      load: "未入力",
      expression: "normal",
      oneLine: "心理検査結果を入力すると、認知書を生成できます。",
      summary: "まだ指数スコアが入力されていません。FIQ / VIQ / PIQ / VC / PO / WM / PS のうち、手元にある項目から入力できます。",
      report: "ここには、入力された心理検査結果を日常語へ翻訳した認知書が表示されます。正式検査の代替ではなく、自己理解と説明補助のためのメモとして扱います。",
      manual: "ここには、自分を動かす条件、詰まりやすい条件、回復しやすい条件が表示されます。まずは手入力か匿名サンプルで動きを確認してください。",
      interpersonal: "ここには、家族・支援者・職場などへ伝えるための短い説明文が表示されます。共有前には必ず内容を確認する設計です。",
      workMode: "ここには、勉強・仕事で力を出しやすい条件が表示されます。入力後、見える化・短時間区切り・外部メモなどの提案が出ます。"
    };
  }

  const fiq = n(scores.fiq);
  const viq = n(scores.viq);
  const piq = n(scores.piq);
  const vc = n(scores.vc);
  const po = n(scores.po);
  const wm = n(scores.wm);
  const ps = n(scores.ps);
  const piqViq = piq && viq ? piq - viq : 0;
  const psWm = ps && wm ? ps - wm : 0;

  const highPS = ps >= 125;
  const highVisual = piq >= 115 || po >= 110;
  const wmLoad = wm > 0 && wm <= 95;
  const languageStable = vc >= 90 && vc <= 109;

  let type = "バランス観察型";
  if (highPS && highVisual && wmLoad) type = "高速処理・視覚直感型";
  else if (highPS && wmLoad) type = "高速処理・外部メモ活用型";
  else if (highVisual) type = "視覚理解・構造把握型";
  else if (languageStable) type = "言語安定・構造化型";

  const strength = highPS ? "処理速度" : highVisual ? "視覚理解" : "構造化";
  const load = psWm >= 30 ? "高" : psWm >= 15 ? "中" : "低";
  const expression: Analysis["expression"] = load === "高" ? "thinking" : highPS ? "focus" : "relief";

  return {
    type,
    strength,
    load,
    expression,
    oneLine: `${type}。強みは${strength}。負荷は${load}めです。`,
    summary: `FIQ ${fiq || "未入力"}、VIQ ${viq || "未入力"}、PIQ ${piq || "未入力"}、VC ${label(vc)}、PO ${label(po)}、WM ${label(wm)}、PS ${label(ps)}。PIQ−VIQは${piqViq || "未計算"}、PS−WMは${psWm || "未計算"}です。`,
    report: `あなたは、頭の中だけで長く保持して順番に処理するより、見える形・体感・直感で構造をつかむ方が力を出しやすい傾向があります。${strength}は出力の軸になりやすく、未整理の情報を同時に抱える場面では負荷が上がりやすい可能性があります。これは医療診断ではなく、生活で使うための自己理解メモです。`,
    manual: `動かすコツは、最初に全体像を図・表・カードにして外へ出すことです。長文を頭の中だけで整理しようとせず、選択肢を3つ以内にし、今日やることを1件に絞ると進みやすくなります。詰まったら、努力量ではなく情報の置き方を変えるのが先です。`,
    interpersonal: `周囲には「情報を見える形にすると力を出しやすい」と伝えるのが有効です。長い口頭指示より、箇条書き・図・チェックリストがあると理解しやすくなります。急な変更や曖昧な依頼では負荷が上がるため、目的・期限・選択肢を短く示してもらうと動きやすくなります。`,
    workMode: `勉強・仕事では、最初に全体マップを作り、次に1テーマずつ処理する流れが合いやすいです。反応が速い時間帯はアウトプット、疲れている時間帯は整理・確認・復習に回すと安定します。見える化、短時間区切り、外部メモ、環境調整が重要です。`
  };
}
