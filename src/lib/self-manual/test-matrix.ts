import type { HypothesisCode } from "./types";

export type ContractTestCase = {
  id: string;
  group: "boundary" | "realistic" | "paraphrase";
  input: string;
  expectedCodes: HypothesisCode[];
  expectedPrimaryCodes: HypothesisCode[];
  expectedCandidateCodes: HypothesisCode[];
  expectedInterventionAllowed: boolean;
  expectedHumanReviewRequired: boolean;
  expectedAdditionalQuestionPresent: boolean;
  mustPreserve: string[];
};

export const contractTestMatrix: ContractTestCase[] = [
  {
    id: "boundary-clear-first-action",
    group: "boundary",
    input: "レポートを書く必要は分かっていたが、最初に資料を開くのか見出しを作るのか決められず始めなかった。",
    expectedCodes: ["unclear_first_action"],
    expectedPrimaryCodes: ["unclear_first_action"],
    expectedCandidateCodes: ["unclear_first_action"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["必要性は理解していた", "最初の操作が未確定"]
  },
  {
    id: "boundary-compound",
    group: "boundary",
    input: "寝不足で疲れており、やることも多すぎて、どれから始めるか決められなかった。",
    expectedCodes: ["state_load", "choice_overload", "compound"],
    expectedPrimaryCodes: ["compound"],
    expectedCandidateCodes: ["choice_overload", "compound", "state_load"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["寝不足", "疲労", "選択肢の多さ"]
  },
  {
    id: "boundary-insufficient",
    group: "boundary",
    input: "なんとなくできなかった。",
    expectedCodes: ["insufficient_information"],
    expectedPrimaryCodes: ["insufficient_information"],
    expectedCandidateCodes: ["insufficient_information"],
    expectedInterventionAllowed: false,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: true,
    mustPreserve: ["追加確認が必要"]
  },
  {
    id: "boundary-self-explanation-conflict",
    group: "boundary",
    input: "自分は怠けているだけだと思う。ただ、締切と最初の手順が書かれていた別の課題はすぐ始められた。",
    expectedCodes: ["unclear_first_action", "unclear_endpoint"],
    expectedPrimaryCodes: ["unclear_first_action", "unclear_endpoint"],
    expectedCandidateCodes: ["unclear_endpoint", "unclear_first_action"],
    expectedInterventionAllowed: false,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: true,
    mustPreserve: ["本人説明は怠け", "別課題では開始できた", "矛盾を保持"]
  },
  {
    id: "boundary-low-priority",
    group: "boundary",
    input: "できないというより、今日はその作業よりゲームを優先したかった。期限もまだ先だった。",
    expectedCodes: ["low_reward_or_priority"],
    expectedPrimaryCodes: ["low_reward_or_priority"],
    expectedCandidateCodes: ["low_reward_or_priority"],
    expectedInterventionAllowed: false,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["能力不足と断定しない", "本人の優先意思"]
  },
  {
    id: "boundary-outside-taxonomy",
    group: "boundary",
    input: "作業を始めようとすると、説明できない身体症状が急に出る。既存のどの理由にも近くない。",
    expectedCodes: ["outside_taxonomy"],
    expectedPrimaryCodes: ["outside_taxonomy"],
    expectedCandidateCodes: ["outside_taxonomy"],
    expectedInterventionAllowed: false,
    expectedHumanReviewRequired: true,
    expectedAdditionalQuestionPresent: true,
    mustPreserve: ["既存分類へ押し込まない", "人による確認が必要"]
  },
  {
    id: "realistic-study-start",
    group: "realistic",
    input: "鑑定理論をやる予定で、何をやるかは分かっていた。机の上に教材が何冊も積まれ、今日使う一冊を選び、机を片づけて該当ページを探す準備が必要だと思ううちに、スマホを見続けて夜になった。",
    expectedCodes: ["choice_overload", "preparation_load", "compound"],
    expectedPrimaryCodes: ["compound"],
    expectedCandidateCodes: ["choice_overload", "compound", "preparation_load"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["課題自体は把握", "教材が複数", "開始前の準備", "スマホ閲覧"]
  },
  {
    id: "realistic-social-trigger",
    group: "realistic",
    input: "コワーキングスペースでは始められるが、自宅で一人だと開始のきっかけがなく後回しになる。",
    expectedCodes: ["missing_social_trigger"],
    expectedPrimaryCodes: ["missing_social_trigger"],
    expectedCandidateCodes: ["missing_social_trigger"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["場所による差", "一人の時だけ開始困難"]
  },
  {
    id: "realistic-anxiety",
    group: "realistic",
    input: "提出物を開くと間違いが見つかりそうで怖く、完成条件は分かっているのにファイルを開けなかった。",
    expectedCodes: ["anxiety_or_failure_avoidance"],
    expectedPrimaryCodes: ["anxiety_or_failure_avoidance"],
    expectedCandidateCodes: ["anxiety_or_failure_avoidance"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["完成条件は明確", "失敗への不安"]
  },
  {
    id: "paraphrase-short",
    group: "paraphrase",
    input: "選択肢が多すぎて始められなかった。",
    expectedCodes: ["choice_overload"],
    expectedPrimaryCodes: ["choice_overload"],
    expectedCandidateCodes: ["choice_overload"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["選択過多"]
  },
  {
    id: "paraphrase-long",
    group: "paraphrase",
    input: "最初にできる作業が五つほど見えていて、どれも重要に思えた。順番を決めようとして比較を続け、結局どれにも着手しなかった。",
    expectedCodes: ["choice_overload"],
    expectedPrimaryCodes: ["choice_overload"],
    expectedCandidateCodes: ["choice_overload"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["複数候補", "比較中に停止"]
  },
  {
    id: "paraphrase-emotional",
    group: "paraphrase",
    input: "もう何からやればいいの、全部大事に見えて嫌になって閉じた。",
    expectedCodes: ["choice_overload"],
    expectedPrimaryCodes: ["choice_overload"],
    expectedCandidateCodes: ["choice_overload"],
    expectedInterventionAllowed: true,
    expectedHumanReviewRequired: false,
    expectedAdditionalQuestionPresent: false,
    mustPreserve: ["感情表現", "選択過多", "作業を閉じた"]
  }
];