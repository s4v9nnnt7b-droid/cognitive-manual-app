import type { HypothesisCode } from "./types";

export type ContractTestCase = {
  id: string;
  group: "boundary" | "realistic" | "paraphrase";
  input: string;
  expectedCodes: HypothesisCode[];
  mustPreserve: string[];
};

export const contractTestMatrix: ContractTestCase[] = [
  {
    id: "boundary-clear-first-action",
    group: "boundary",
    input: "レポートを書く必要は分かっていたが、最初に資料を開くのか見出しを作るのか決められず始めなかった。",
    expectedCodes: ["unclear_first_action"],
    mustPreserve: ["必要性は理解していた", "最初の操作が未確定"]
  },
  {
    id: "boundary-compound",
    group: "boundary",
    input: "寝不足で疲れており、やることも多すぎて、どれから始めるか決められなかった。",
    expectedCodes: ["state_load", "choice_overload", "compound"],
    mustPreserve: ["寝不足", "疲労", "選択肢の多さ"]
  },
  {
    id: "boundary-insufficient",
    group: "boundary",
    input: "なんとなくできなかった。",
    expectedCodes: ["insufficient_information"],
    mustPreserve: ["追加確認が必要"]
  },
  {
    id: "boundary-self-explanation-conflict",
    group: "boundary",
    input: "自分は怠けているだけだと思う。ただ、締切と最初の手順が書かれていた別の課題はすぐ始められた。",
    expectedCodes: ["unclear_first_action", "unclear_endpoint"],
    mustPreserve: ["本人説明は怠け", "別課題では開始できた", "矛盾を保持"]
  },
  {
    id: "boundary-low-priority",
    group: "boundary",
    input: "できないというより、今日はその作業よりゲームを優先したかった。期限もまだ先だった。",
    expectedCodes: ["low_reward_or_priority"],
    mustPreserve: ["能力不足と断定しない", "本人の優先意思"]
  },
  {
    id: "boundary-outside-taxonomy",
    group: "boundary",
    input: "作業を始めようとすると、説明できない身体症状が急に出る。既存のどの理由にも近くない。",
    expectedCodes: ["outside_taxonomy"],
    mustPreserve: ["既存分類へ押し込まない", "人による確認が必要"]
  },
  {
    id: "realistic-study-start",
    group: "realistic",
    input: "鑑定理論をやる予定だった。何をやるかは分かっていたけど、机の上に教材が何冊もあってスマホを見ているうちに夜になった。",
    expectedCodes: ["choice_overload", "preparation_load"],
    mustPreserve: ["課題自体は把握", "教材が複数", "スマホ閲覧"]
  },
  {
    id: "realistic-social-trigger",
    group: "realistic",
    input: "コワーキングスペースでは始められるが、自宅で一人だと開始のきっかけがなく後回しになる。",
    expectedCodes: ["missing_social_trigger"],
    mustPreserve: ["場所による差", "一人の時だけ開始困難"]
  },
  {
    id: "realistic-anxiety",
    group: "realistic",
    input: "提出物を開くと間違いが見つかりそうで怖く、完成条件は分かっているのにファイルを開けなかった。",
    expectedCodes: ["anxiety_or_failure_avoidance"],
    mustPreserve: ["完成条件は明確", "失敗への不安"]
  },
  {
    id: "paraphrase-short",
    group: "paraphrase",
    input: "選択肢が多すぎて始められなかった。",
    expectedCodes: ["choice_overload"],
    mustPreserve: ["選択過多"]
  },
  {
    id: "paraphrase-long",
    group: "paraphrase",
    input: "最初にできる作業が五つほど見えていて、どれも重要に思えた。順番を決めようとして比較を続け、結局どれにも着手しなかった。",
    expectedCodes: ["choice_overload"],
    mustPreserve: ["複数候補", "比較中に停止"]
  },
  {
    id: "paraphrase-emotional",
    group: "paraphrase",
    input: "もう何からやればいいの、全部大事に見えて嫌になって閉じた。",
    expectedCodes: ["choice_overload"],
    mustPreserve: ["感情表現", "選択過多", "作業を閉じた"]
  }
];
