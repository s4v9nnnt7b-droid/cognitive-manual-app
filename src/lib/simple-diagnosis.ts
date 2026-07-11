export const axisKeys = [
  "actionTempo",
  "exploration",
  "structure",
  "immersion",
  "socialDrive",
  "stimulation",
  "uncertainty",
  "outputStyle"
] as const;

export type AxisKey = (typeof axisKeys)[number];
export type QuestionDirection = "forward" | "reverse";
export type AxisConfidence = "high" | "medium" | "low" | "unrated";
export type ResultConfidence = "high" | "medium" | "low";

export type Question = {
  id: string;
  text: string;
  axis?: AxisKey;
  direction?: QuestionDirection;
  options?: readonly string[];
  supplementalKey?: "actionEvidence" | "immersionEvidence" | "recoveryEvidence" | "stateDependence";
};

export type Answers = Record<string, number>;

export const scaleOptions = [
  "まったく当てはまらない",
  "あまり当てはまらない",
  "どちらともいえない",
  "やや当てはまる",
  "とても当てはまる"
] as const;

export const questions: Question[] = [
  { id: "q01", text: "新しいことは、準備を完璧にするより、まず小さく試してみることが多い。", axis: "actionTempo", direction: "forward" },
  { id: "q02", text: "大切な作業は、人と相談しながら進めるより、一人で静かに進める方が力を出しやすい。", axis: "socialDrive", direction: "reverse" },
  { id: "q03", text: "知らない分野や新しい方法を見ると、試してみたくなる。", axis: "exploration", direction: "forward" },
  { id: "q04", text: "音や人の動きが少なく、先の流れが読める環境の方が落ち着く。", axis: "stimulation", direction: "reverse" },
  { id: "q05", text: "複雑な内容は、分類、図、手順などに整理すると理解しやすい。", axis: "structure", direction: "forward" },
  { id: "q06", text: "正解がまだ分からなくても、仮説を立てて進めることができる。", axis: "uncertainty", direction: "forward" },
  { id: "q07", text: "一つのことを長く続けるより、複数のことを切り替える方が調子がよい。", axis: "immersion", direction: "reverse" },
  { id: "q08", text: "考えるだけより、実際に手を動かしたり試したりすると理解が深まる。", axis: "outputStyle", direction: "forward" },
  { id: "q09", text: "始める前に、手順や失敗の可能性を十分に確認しておきたい。", axis: "actionTempo", direction: "reverse" },
  { id: "q10", text: "人と話したり反応をもらったりすると、考えが進みやすい。", axis: "socialDrive", direction: "forward" },
  { id: "q11", text: "新しい方法を次々試すより、慣れた方法を磨く方が落ち着く。", axis: "exploration", direction: "reverse" },
  { id: "q12", text: "変化が多くスピード感のある場面では、気持ちが乗りやすい。", axis: "stimulation", direction: "forward" },
  { id: "q13", text: "細かい計画を決めるより、その場の流れに合わせる方が得意だ。", axis: "structure", direction: "reverse" },
  { id: "q14", text: "見通しや基準がはっきりしない状態では、動き始めにくい。", axis: "uncertainty", direction: "reverse" },
  { id: "q15", text: "興味のあることなら、時間を忘れて一つのことに集中できる。", axis: "immersion", direction: "forward" },
  { id: "q16", text: "物を作ったり体を動かしたりするより、文章や概念で整理する方が得意だ。", axis: "outputStyle", direction: "reverse" },
  { id: "q17", text: "短い時間で判断し、その後で修正していく方がやりやすい。", axis: "actionTempo", direction: "forward" },
  { id: "q18", text: "誰かと役割を分けたり相談したりすると、やる気が上がりやすい。", axis: "socialDrive", direction: "forward" },
  { id: "q19", text: "小さな変化や違和感から、別の可能性を考えることが多い。", axis: "exploration", direction: "forward" },
  { id: "q20", text: "競争や本番の緊張感があると、普段より集中しやすい。", axis: "stimulation", direction: "forward" },
  { id: "q21", text: "目的や全体像が分からないまま作業を始めると、やりにくさを感じる。", axis: "structure", direction: "forward" },
  { id: "q22", text: "失敗しても戻せる範囲なら、新しい選択を試すことができる。", axis: "uncertainty", direction: "forward" },
  { id: "q23", text: "途中で何度も話しかけられたり作業を切り替えたりすると、集中を戻すのに時間がかかる。", axis: "immersion", direction: "forward" },
  { id: "q24", text: "説明を聞くだけより、実演、操作、現物を見る方が分かりやすい。", axis: "outputStyle", direction: "forward" },
  {
    id: "q25",
    text: "最近3か月で、興味を持った新しいことを48時間以内に試した経験はどの程度ありますか。",
    options: ["ない", "1回", "2〜3回", "4〜5回", "6回以上"],
    supplementalKey: "actionEvidence"
  },
  {
    id: "q26",
    text: "最近3か月で、一つの作業や趣味に90分以上続けて没頭した経験はどの程度ありますか。",
    options: ["ない", "1回", "月に数回", "週に1回程度", "週に複数回"],
    supplementalKey: "immersionEvidence"
  },
  {
    id: "q27",
    text: "疲れた時の回復方法として、どちらが自分に近いですか。",
    options: [
      "一人で静かに過ごす方がかなり回復する",
      "一人で過ごす方がやや回復する",
      "どちらも同じ程度",
      "人と話す方がやや回復する",
      "人と話す方がかなり回復する"
    ],
    supplementalKey: "recoveryEvidence"
  },
  {
    id: "q28",
    text: "睡眠不足、体調不良、強い緊張がある時は、普段と違う答え方になると思いますか。",
    options: ["ほとんど変わらない", "あまり変わらない", "分からない", "やや変わる", "大きく変わる"],
    supplementalKey: "stateDependence"
  }
];

export const axisDefinitions: Record<
  AxisKey,
  { label: string; lowLabel: string; highLabel: string; lowSummary: string; highSummary: string }
> = {
  actionTempo: {
    label: "行動テンポ",
    lowLabel: "準備して動く",
    highLabel: "まず試して動く",
    lowSummary: "見通しと準備を整えることで、失敗を減らしやすい。",
    highSummary: "小さく着手し、反応を見ながら速く修正しやすい。"
  },
  exploration: {
    label: "探索ドライブ",
    lowLabel: "磨き上げる",
    highLabel: "新しさを探す",
    lowSummary: "既存の方法を磨き、再現性と習熟を高めやすい。",
    highSummary: "変化や違和感から、新しい可能性を見つけやすい。"
  },
  structure: {
    label: "構造化ドライブ",
    lowLabel: "流れに適応する",
    highLabel: "整理して設計する",
    lowSummary: "状況に合わせ、枠に縛られず柔軟に進めやすい。",
    highSummary: "全体像、分類、順序、ルールを作ると力が出やすい。"
  },
  immersion: {
    label: "没入深度",
    lowLabel: "広く切り替える",
    highLabel: "深く潜る",
    lowSummary: "複数のテーマをつなぎ、変化へ対応しやすい。",
    highSummary: "一つの対象へ深く集中し、専門性を高めやすい。"
  },
  socialDrive: {
    label: "対人駆動",
    lowLabel: "一人で充電する",
    highLabel: "人との反応で動く",
    lowSummary: "静かな一人時間と自律作業で力を回復しやすい。",
    highSummary: "会話、協力、反応があると考えと行動が進みやすい。"
  },
  stimulation: {
    label: "刺激適合",
    lowLabel: "静かな環境で安定",
    highLabel: "変化の中で活性化",
    lowSummary: "静けさ、一定のペース、予測できる環境で安定しやすい。",
    highSummary: "スピード、変化、競争、ライブ感で集中しやすい。"
  },
  uncertainty: {
    label: "不確実性耐性",
    lowLabel: "基準を確認する",
    highLabel: "仮説で進める",
    lowSummary: "安全、品質、基準を確かめることで精度を高めやすい。",
    highSummary: "正解が未確定でも、仮説を置いて試しやすい。"
  },
  outputStyle: {
    label: "出力スタイル",
    lowLabel: "概念と言葉で形にする",
    highLabel: "実践と具体物で形にする",
    lowSummary: "文章、分析、説明、抽象化で理解をまとめやすい。",
    highSummary: "制作、実演、運動、操作を通じて理解を深めやすい。"
  }
};

export const typeIds = [
  "sprinter",
  "architect",
  "scout",
  "diver",
  "crafter",
  "navigator",
  "connector",
  "guardian"
] as const;

export type TypeId = (typeof typeIds)[number];

export type TypeDefinition = {
  id: TypeId;
  label: string;
  symbol: string;
  tagline: string;
  description: string;
  strengths: string[];
  loads: string[];
  work: string[];
  sports: string[];
  hobbies: string[];
  relationships: string[];
};

export const typeDefinitions: Record<TypeId, TypeDefinition> = {
  sprinter: {
    id: "sprinter",
    label: "スプリンター",
    symbol: "⚡",
    tagline: "動いて反応を得るほど、精度が上がる人。",
    description: "考え切ってからではなく、小さく着手し、結果を見て修正することで前へ進みやすいタイプです。",
    strengths: ["初動が速い", "短期決戦に強い", "停滞を打破できる"],
    loads: ["長い事前調整", "決定権のない待機", "変化のない反復"],
    work: ["試作や改善を短い周期で回す", "期限と判断範囲が明確な役割", "初期立ち上げや緊急対応"],
    sports: ["瞬時の判断がある競技", "攻守の切り替えが速い競技", "短い局面で勝負が決まる役割"],
    hobbies: ["短期制作", "対戦・攻略", "新しい店や場所を試す"],
    relationships: ["返答速度の違いを先に共有する", "急かさずに期限を具体化する", "慎重な相手の確認時間を尊重する"]
  },
  architect: {
    id: "architect",
    label: "アーキテクト",
    symbol: "🏗️",
    tagline: "複雑なものを、再利用できる仕組みに変える人。",
    description: "全体像、分類、順序、ルールを組み立て、ばらばらの情報を運用できる構造へ変えるタイプです。",
    strengths: ["全体設計", "体系化", "長期構想"],
    loads: ["目的のない場当たり対応", "前提の頻繁な変更", "整理されていない依頼"],
    work: ["設計・企画・業務改善", "全体マップと工程を作る", "複数要素を一つの仕組みに統合する"],
    sports: ["戦術や配置を読む役割", "全体を見渡すポジション", "再現可能な練習設計"],
    hobbies: ["世界観づくり", "システム設計", "分類・比較・コレクション整理"],
    relationships: ["話の目的と前提をそろえる", "予定変更は理由と影響を示す", "感情と解決策を分けて話す"]
  },
  scout: {
    id: "scout",
    label: "スカウト",
    symbol: "🔭",
    tagline: "まだ言葉になっていない可能性を、先に見つける人。",
    description: "変化、違和感、新しい情報から選択肢を広げ、次に起きそうなことを早く察知するタイプです。",
    strengths: ["兆候の発見", "情報収集", "選択肢の拡張"],
    loads: ["自由度のない手順", "結論が固定された作業", "単調な維持管理"],
    work: ["調査・企画・新規事業", "比較から可能性を見つける", "初期段階の課題を探索する"],
    sports: ["状況が変化する競技", "広い視野と予測を使う役割", "即興的な選択があるプレー"],
    hobbies: ["新技術探索", "街歩き・旅行", "映画・音楽・道具の比較研究"],
    relationships: ["新しい提案を否定せず一度並べる", "結論を急ぐ前に選択肢を整理する", "安定を求める相手へ見通しを伝える"]
  },
  diver: {
    id: "diver",
    label: "ダイバー",
    symbol: "🌊",
    tagline: "一つの世界へ深く潜り、見落とされたものを見つける人。",
    description: "興味のある対象へ長く集中し、細部まで理解して専門性と精度を高めるタイプです。",
    strengths: ["深い理解", "専門性", "持続集中"],
    loads: ["頻繁な割り込み", "浅い並行作業", "短時間の話題転換"],
    work: ["研究・分析・専門業務", "割り込みの少ない集中時間", "一つのテーマを深く掘る"],
    sports: ["反復で技術を磨く競技", "自分のリズムを保てる種目", "細かな感覚調整が重要な役割"],
    hobbies: ["読書・研究", "長編ゲーム", "制作・収集を深く続ける"],
    relationships: ["一人で整理する時間を確保する", "話題を一度に増やしすぎない", "返答を急かさず深さを尊重する"]
  },
  crafter: {
    id: "crafter",
    label: "クラフター",
    symbol: "🛠️",
    tagline: "考えや材料を、触れられる成果へ仕上げる人。",
    description: "手を動かし、作る、直す、実演することで理解と品質を高めるタイプです。",
    strengths: ["制作", "現物改善", "反復による上達"],
    loads: ["抽象論だけの会議", "成果が見えない仕事", "手応えのない作業"],
    work: ["制作・実装・現場改善", "完成物が見える仕事", "試しながら精度を上げる"],
    sports: ["身体感覚を磨く競技", "道具操作がある種目", "フォーム改善を実感できる練習"],
    hobbies: ["DIY・料理・工作", "運動・楽器", "写真・動画・デザイン制作"],
    relationships: ["言葉だけでなく具体例を見せる", "一緒に作業しながら話す", "感謝や評価を具体的な成果に結びつける"]
  },
  navigator: {
    id: "navigator",
    label: "ナビゲーター",
    symbol: "🧭",
    tagline: "現在地を整理し、次の一歩を分かりやすく示す人。",
    description: "情報や人の状況を整理し、順序、判断材料、伝え方を整えて前進を助けるタイプです。",
    strengths: ["説明", "手順化", "進行整理"],
    loads: ["情報不足の丸投げ", "目的の不一致", "基準の頻繁な変更"],
    work: ["編集・教育・進行管理", "複雑な内容を分かりやすくする", "判断材料と次の行動を整理する"],
    sports: ["味方へ声をかける役割", "試合の流れを整理するポジション", "戦術を共有する役割"],
    hobbies: ["解説・レビュー", "旅行計画", "人に教える・まとめる活動"],
    relationships: ["結論と理由を分けて伝える", "話し合いの論点を一つずつ扱う", "相手が望む支援を確認してから整理する"]
  },
  connector: {
    id: "connector",
    label: "コネクター",
    symbol: "🤝",
    tagline: "人と情報をつなぎ、協力が起きる状態を作る人。",
    description: "会話、共感、紹介、場づくりを通じて、人や情報の間に流れを作るタイプです。",
    strengths: ["関係構築", "巻き込み", "場の活性化"],
    loads: ["孤立した長時間作業", "反応のない環境", "冷えた関係性"],
    work: ["調整・営業・コミュニティ運営", "複数人の協力を引き出す", "情報を必要な人へつなぐ"],
    sports: ["連携が重要なチーム競技", "声と反応を使う役割", "一体感で力が上がる環境"],
    hobbies: ["イベント参加", "共同制作", "スポーツ観戦や交流活動"],
    relationships: ["反応が必要なことを言葉にする", "一人時間が必要な相手を尊重する", "感情の共有と問題解決を分ける"]
  },
  guardian: {
    id: "guardian",
    label: "ガーディアン",
    symbol: "🛡️",
    tagline: "品質、安全、継続を守り、安心して回る状態を作る人。",
    description: "危険や抜けを察知し、基準、手順、継続性を守って安定した運用を支えるタイプです。",
    strengths: ["品質管理", "継続", "リスク察知"],
    loads: ["無計画な変更", "根拠のない挑戦", "ルールが守られない環境"],
    work: ["品質保証・運用・支援", "チェックと継続が価値になる役割", "安全な仕組みを守る"],
    sports: ["守備・安定に貢献する役割", "継続練習で精度が上がる競技", "チームの土台を支えるポジション"],
    hobbies: ["育成・手入れ", "記録・コレクション管理", "落ち着いた習慣型の活動"],
    relationships: ["変更は早めに共有する", "約束と役割を曖昧にしない", "安心材料を示してから新しい提案をする"]
  }
};

export type AxisResult = {
  key: AxisKey;
  score: number;
  confidence: AxisConfidence;
  label: string;
  poleLabel: string;
  summary: string;
};

export type DiagnosisResult = {
  axisScores: Record<AxisKey, number>;
  axes: AxisResult[];
  typeScores: Record<TypeId, number>;
  primaryType: TypeId;
  secondaryType: TypeId;
  primary: TypeDefinition;
  secondary: TypeDefinition;
  displayName: string;
  tendency: "strong" | "medium" | "balanced" | "hybrid";
  resultConfidence: ResultConfidence;
  stateTags: string[];
  consistencyCount: number;
  answeredCount: number;
};

function answerToScore(value: number, direction: QuestionDirection = "forward"): number {
  const clamped = Math.min(5, Math.max(1, value));
  return direction === "forward" ? ((clamped - 1) / 4) * 100 : ((5 - clamped) / 4) * 100;
}

function average(values: number[]): number {
  if (!values.length) return 50;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function axisConfidence(values: number[]): AxisConfidence {
  if (values.length < 2) return "unrated";
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 25) return "high";
  if (spread <= 50) return "medium";
  return "low";
}

function axisPole(key: AxisKey, score: number): { poleLabel: string; summary: string } {
  const definition = axisDefinitions[key];
  if (score >= 67) return { poleLabel: definition.highLabel, summary: definition.highSummary };
  if (score <= 33) return { poleLabel: definition.lowLabel, summary: definition.lowSummary };
  return {
    poleLabel: "状況で使い分ける",
    summary: `${definition.lowLabel}と${definition.highLabel}を、場面に応じて使い分けやすい。`
  };
}

function pairName(primary: TypeId, secondary: TypeId): string {
  const labels: Partial<Record<`${TypeId}:${TypeId}`, string>> = {
    "scout:architect": "探索設計型",
    "architect:scout": "設計探索型",
    "sprinter:scout": "高速探索型",
    "scout:sprinter": "探索推進型",
    "sprinter:guardian": "推進安定型",
    "guardian:sprinter": "安定推進型",
    "architect:crafter": "設計実装型",
    "crafter:architect": "実装設計型",
    "diver:navigator": "専門案内型",
    "navigator:diver": "案内専門型",
    "connector:navigator": "関係整理型",
    "navigator:connector": "整理連携型",
    "guardian:architect": "安定設計型",
    "architect:guardian": "設計保全型",
    "crafter:sprinter": "高速実装型",
    "sprinter:crafter": "実行制作型"
  };
  return labels[`${primary}:${secondary}`] ?? `${typeDefinitions[primary].label} × ${typeDefinitions[secondary].label}`;
}

function typeScore(axis: Record<AxisKey, number>, type: TypeId): number {
  const a1 = axis.actionTempo / 100;
  const a2 = axis.exploration / 100;
  const a3 = axis.structure / 100;
  const a4 = axis.immersion / 100;
  const a5 = axis.socialDrive / 100;
  const a6 = axis.stimulation / 100;
  const a7 = axis.uncertainty / 100;
  const a8 = axis.outputStyle / 100;

  const scores: Record<TypeId, number> = {
    sprinter: a1 * 0.35 + a7 * 0.35 + a2 * 0.2 + a6 * 0.1,
    architect: a3 * 0.4 + a4 * 0.25 + (1 - a8) * 0.2 + (1 - a7) * 0.15,
    scout: a2 * 0.4 + a7 * 0.25 + (1 - a4) * 0.2 + a6 * 0.15,
    diver: a4 * 0.45 + (1 - a6) * 0.2 + (1 - a5) * 0.2 + (1 - a7) * 0.15,
    crafter: a8 * 0.45 + a4 * 0.25 + a3 * 0.15 + (1 - a2) * 0.15,
    navigator: a3 * 0.35 + a5 * 0.25 + (1 - a8) * 0.25 + (1 - a7) * 0.15,
    connector: a5 * 0.45 + a6 * 0.2 + a2 * 0.2 + a1 * 0.15,
    guardian: (1 - a7) * 0.35 + a3 * 0.3 + (1 - a6) * 0.2 + (1 - a2) * 0.15
  };

  return rounded(scores[type] * 100);
}

export function scoreDiagnosis(answers: Answers): DiagnosisResult {
  const axisScores = {} as Record<AxisKey, number>;
  const confidenceByAxis = {} as Record<AxisKey, AxisConfidence>;

  for (const key of axisKeys) {
    const values = questions
      .filter((question) => question.axis === key)
      .map((question) => {
        const answer = answers[question.id];
        if (answer == null || question.axis == null) return null;
        return answerToScore(answer, question.direction);
      })
      .filter((value): value is number => value != null);

    axisScores[key] = rounded(average(values));
    confidenceByAxis[key] = axisConfidence(values);
  }

  const typeScores = {} as Record<TypeId, number>;
  for (const typeId of typeIds) typeScores[typeId] = typeScore(axisScores, typeId);

  const orderedTypes = [...typeIds].sort((left, right) => typeScores[right] - typeScores[left]);
  const primaryType = orderedTypes[0] ?? "scout";
  const secondaryType = orderedTypes[1] ?? "architect";
  const topScore = typeScores[primaryType];
  const secondScore = typeScores[secondaryType];
  const gap = topScore - secondScore;

  let tendency: DiagnosisResult["tendency"] = "balanced";
  if (gap < 5) tendency = "hybrid";
  else if (topScore >= 65 && gap >= 8) tendency = "strong";
  else if (topScore >= 55) tendency = "medium";

  const consistency: boolean[] = [];
  const q25 = answers.q25;
  const q26 = answers.q26;
  const q27 = answers.q27;
  if (q25 != null) {
    const evidence = answerToScore(q25);
    consistency.push(Math.abs(evidence - average([axisScores.actionTempo, axisScores.exploration, axisScores.uncertainty])) <= 25);
  }
  if (q26 != null) consistency.push(Math.abs(answerToScore(q26) - axisScores.immersion) <= 25);
  if (q27 != null) consistency.push(Math.abs(answerToScore(q27) - axisScores.socialDrive) <= 25);

  const answeredCount = questions.filter((question) => answers[question.id] != null).length;
  const missingCount = questions.length - answeredCount;
  const lowConfidenceAxes = axisKeys.filter((key) => confidenceByAxis[key] === "low").length;
  const consistencyCount = consistency.filter(Boolean).length;
  const stateDependence = answers.q28 ?? 3;

  let resultConfidence: ResultConfidence = "medium";
  if (missingCount === 0 && lowConfidenceAxes <= 1 && consistencyCount >= 2 && stateDependence < 5) {
    resultConfidence = "high";
  } else if (missingCount >= 3 || lowConfidenceAxes >= 4 || stateDependence === 5) {
    resultConfidence = "low";
  }

  const stateTags: string[] = [];
  if (stateDependence >= 4) stateTags.push("状態変動あり");
  if (lowConfidenceAxes >= 2) stateTags.push("場面差が大きい可能性");
  if (missingCount > 0) stateTags.push(`未回答${missingCount}問`);

  const axes = axisKeys.map((key) => {
    const pole = axisPole(key, axisScores[key]);
    return {
      key,
      score: Math.round(axisScores[key]),
      confidence: confidenceByAxis[key],
      label: axisDefinitions[key].label,
      poleLabel: pole.poleLabel,
      summary: pole.summary
    };
  });

  return {
    axisScores,
    axes,
    typeScores,
    primaryType,
    secondaryType,
    primary: typeDefinitions[primaryType],
    secondary: typeDefinitions[secondaryType],
    displayName: pairName(primaryType, secondaryType),
    tendency,
    resultConfidence,
    stateTags,
    consistencyCount,
    answeredCount
  };
}

export function makeShareText(result: DiagnosisResult): string {
  return [
    `私の自分取説タイプは「${result.displayName}」`,
    `${result.primary.symbol} 主：${result.primary.label} / ${result.secondary.symbol} 副：${result.secondary.label}`,
    result.primary.tagline,
    "※医療診断や能力判定ではなく、自己理解のための簡易チェックです。"
  ].join("\n");
}
