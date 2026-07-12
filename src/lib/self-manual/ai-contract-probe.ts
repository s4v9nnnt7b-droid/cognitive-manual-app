import type { AIAnalysis } from "./schemas";

export const aiContractProbeMetadata = {
  executedAt: "2026-07-12T03:00:00.000Z",
  model: "GPT-5.6 Thinking",
  mode: "offline_recorded_contract_probe",
  productionApiConnected: false,
  longTermMemoryWriteEnabled: false
} as const;

export type AIContractProbeResult = {
  testCaseId: string;
  output: AIAnalysis;
};

const normalSafety = {
  isDiagnosis: false as const,
  containsMedicationAdvice: false as const,
  requiresHumanReview: false,
  reviewReason: null
};

export const aiContractProbeResults: AIContractProbeResult[] = [
  {
    testCaseId: "boundary-clear-first-action",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-clear-first-action",
      evidence: [
        {
          id: "bcfa-e1",
          kind: "reported_fact",
          statement: "必要性は理解していた",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bcfa-e2",
          kind: "reported_fact",
          statement: "最初に資料を開くか見出しを作るか決められず、最初の操作が未確定だった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bcfa-e3",
          kind: "reported_fact",
          statement: "レポートに着手しなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["bcfa-e1", "bcfa-e2", "bcfa-e3"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "bcfa-h1",
          rank: 1,
          code: "unclear_first_action",
          label: "最初の操作が決まっていない",
          supportEvidenceIds: ["bcfa-e2", "bcfa-e3"],
          counterEvidenceIds: ["bcfa-e1"],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "medium",
          rationale: "必要性は理解していた一方、最初の操作が未確定で停止している"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: {
        hypothesisId: "bcfa-h1",
        interventionId: "open-source-file-only",
        instruction: "資料ファイルを一つだけ開き、内容は編集せず先頭を表示する",
        observableResult: "資料ファイルを開けたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "boundary-compound",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-compound",
      evidence: [
        {
          id: "bc-e1",
          kind: "state_factor",
          statement: "寝不足だった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bc-e2",
          kind: "state_factor",
          statement: "疲労があった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bc-e3",
          kind: "reported_fact",
          statement: "やることが多く、選択肢の多さから順番を決められなかった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bc-e4",
          kind: "reported_fact",
          statement: "どの作業にも着手しなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["bc-e3", "bc-e4"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "bc-h1",
          rank: 1,
          code: "compound",
          label: "状態負荷と選択過多の複合",
          supportEvidenceIds: ["bc-e3", "bc-e4"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: ["bc-e1", "bc-e2"],
          unknowns: ["睡眠が十分な日にも選択過多で止まるか"],
          confidence: "medium",
          rationale: "寝不足と疲労に加え、選択肢の多さが同時に存在する"
        },
        {
          id: "bc-h2",
          rank: 2,
          code: "state_load",
          label: "一時的な状態負荷",
          supportEvidenceIds: [],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: ["bc-e1", "bc-e2"],
          unknowns: [],
          confidence: "provisional",
          rationale: "寝不足と疲労が着手能力を下げた可能性がある"
        },
        {
          id: "bc-h3",
          rank: 3,
          code: "choice_overload",
          label: "選択過多",
          supportEvidenceIds: ["bc-e3", "bc-e4"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "provisional",
          rationale: "候補が多く順番を決められず停止している"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["睡眠が十分な日でも、選択肢が多いと同じように止まりますか"],
      recommendedIntervention: {
        hypothesisId: "bc-h3",
        interventionId: "show-one-task",
        instruction: "今日扱う作業を一件だけ表示し、残りを一時的に隠す",
        observableResult: "表示した一件に着手できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "boundary-insufficient",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-insufficient",
      evidence: [
        {
          id: "bi-e1",
          kind: "reported_fact",
          statement: "なんとなくできなかったと報告している",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["bi-e1"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "bi-h1",
          rank: 1,
          code: "insufficient_information",
          label: "情報不足",
          supportEvidenceIds: ["bi-e1"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["止まった時点", "身体状態", "環境", "本人が考える理由"],
          confidence: "low",
          rationale: "原因を区別するには追加確認が必要"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["始めようとした時、最初にどこで止まりましたか"],
      recommendedIntervention: null,
      safety: normalSafety
    }
  },
  {
    testCaseId: "boundary-self-explanation-conflict",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-self-explanation-conflict",
      evidence: [
        {
          id: "bsec-e1",
          kind: "self_explanation",
          statement: "本人説明は怠けているだけというものだった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bsec-e2",
          kind: "reported_fact",
          statement: "締切と最初の手順が書かれた別課題では開始できた",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bsec-e3",
          kind: "counterevidence",
          statement: "別課題では開始できたため、全般的な怠けという説明だけでは整合しない",
          source: "current_user_text",
          verification: "unverified"
        }
      ],
      factEvidenceIds: ["bsec-e2"],
      selfExplanationEvidenceIds: ["bsec-e1"],
      hypotheses: [
        {
          id: "bsec-h1",
          rank: 1,
          code: "unclear_first_action",
          label: "最初の操作の不明確さ",
          supportEvidenceIds: ["bsec-e2"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["今回の課題で最初の手順が明確だったか"],
          confidence: "provisional",
          rationale: "最初の手順が明示された別課題では開始できている"
        },
        {
          id: "bsec-h2",
          rank: 2,
          code: "unclear_endpoint",
          label: "終了条件の不明確さ",
          supportEvidenceIds: ["bsec-e2"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["今回の課題の完成条件が明確だったか"],
          confidence: "provisional",
          rationale: "締切と手順の明示が開始差に関係した可能性がある"
        }
      ],
      unresolvedContradictions: [
        {
          id: "bsec-c1",
          evidenceIds: ["bsec-e1", "bsec-e2", "bsec-e3"],
          description: "本人説明は怠けだが別課題では開始できたため、矛盾を保持して追加確認する"
        }
      ],
      additionalQuestions: ["今回始められなかった課題では、最初の手順と完成条件は書かれていましたか"],
      recommendedIntervention: {
        hypothesisId: "bsec-h1",
        interventionId: "write-first-action",
        instruction: "開始前に最初の操作だけを一行で書く",
        observableResult: "一行を書いた後に着手できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "boundary-low-priority",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-low-priority",
      evidence: [
        {
          id: "blp-e1",
          kind: "self_explanation",
          statement: "本人の優先意思として、今日は作業よりゲームを優先したかった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "blp-e2",
          kind: "reported_fact",
          statement: "期限はまだ先だった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "blp-e3",
          kind: "reported_fact",
          statement: "その作業を開始しなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["blp-e2", "blp-e3"],
      selfExplanationEvidenceIds: ["blp-e1"],
      hypotheses: [
        {
          id: "blp-h1",
          rank: 1,
          code: "low_reward_or_priority",
          label: "その時点での優先度が低かった",
          supportEvidenceIds: ["blp-e1", "blp-e2", "blp-e3"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "medium",
          rationale: "能力不足と断定しない。本人の優先意思と期限の遠さが明示されている"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: null,
      safety: normalSafety
    }
  },
  {
    testCaseId: "boundary-outside-taxonomy",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "boundary-outside-taxonomy",
      evidence: [
        {
          id: "bot-e1",
          kind: "reported_fact",
          statement: "作業を始めようとすると説明できない身体症状が急に出る",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "bot-e2",
          kind: "self_explanation",
          statement: "既存のどの理由にも近くないと感じている",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["bot-e1"],
      selfExplanationEvidenceIds: ["bot-e2"],
      hypotheses: [
        {
          id: "bot-h1",
          rank: 1,
          code: "outside_taxonomy",
          label: "既存分類外",
          supportEvidenceIds: ["bot-e1", "bot-e2"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["症状の種類", "頻度", "作業以外でも生じるか"],
          confidence: "low",
          rationale: "既存分類へ押し込まない。身体症状を含むため人による確認が必要"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["その身体症状は作業以外の場面でも起きますか"],
      recommendedIntervention: null,
      safety: {
        isDiagnosis: false,
        containsMedicationAdvice: false,
        requiresHumanReview: true,
        reviewReason: "説明できない身体症状があり、既存分類外として専門家または本人による追加確認が必要"
      }
    }
  },
  {
    testCaseId: "realistic-study-start",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "realistic-study-start",
      evidence: [
        {
          id: "rss-e1",
          kind: "reported_fact",
          statement: "課題自体は把握しており、鑑定理論をやる予定だった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "rss-e2",
          kind: "reported_fact",
          statement: "机の上に教材が複数あった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "rss-e3",
          kind: "reported_fact",
          statement: "スマホ閲覧を続けているうちに夜になった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "rss-e4",
          kind: "reported_fact",
          statement: "鑑定理論に着手しなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["rss-e1", "rss-e2", "rss-e3", "rss-e4"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "rss-h1",
          rank: 1,
          code: "choice_overload",
          label: "教材選択の過多",
          supportEvidenceIds: ["rss-e2", "rss-e4"],
          counterEvidenceIds: ["rss-e1"],
          stateFactorEvidenceIds: [],
          unknowns: ["教材を一冊だけ出した場合の着手差"],
          confidence: "provisional",
          rationale: "課題自体は把握していたが、教材が複数ある状況で選択が必要だった"
        },
        {
          id: "rss-h2",
          rank: 2,
          code: "preparation_load",
          label: "開始前の準備負荷",
          supportEvidenceIds: ["rss-e2", "rss-e3", "rss-e4"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["教材選択後に追加準備が必要だったか"],
          confidence: "provisional",
          rationale: "教材が複数見えている状態が開始前の整理負荷になった可能性がある"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["教材を一冊だけ机に出していた日は始めやすかったですか"],
      recommendedIntervention: {
        hypothesisId: "rss-h1",
        interventionId: "single-material-view",
        instruction: "今日使う教材を一冊だけ机に残し、他を視界から外す",
        observableResult: "一冊だけにしてから5分以内に着手できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "realistic-social-trigger",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "realistic-social-trigger",
      evidence: [
        {
          id: "rst-e1",
          kind: "reported_fact",
          statement: "コワーキングスペースでは開始できる",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "rst-e2",
          kind: "reported_fact",
          statement: "自宅で一人の時だけ開始困難になり、開始のきっかけがなく後回しになる",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "rst-e3",
          kind: "counterevidence",
          statement: "場所による差があるため、全般的な着手能力不足とは限らない",
          source: "current_user_text",
          verification: "unverified"
        }
      ],
      factEvidenceIds: ["rst-e1", "rst-e2"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "rst-h1",
          rank: 1,
          code: "missing_social_trigger",
          label: "開始の外的きっかけ不足",
          supportEvidenceIds: ["rst-e1", "rst-e2"],
          counterEvidenceIds: ["rst-e3"],
          stateFactorEvidenceIds: [],
          unknowns: ["自宅でも開始宣言があれば差が縮まるか"],
          confidence: "medium",
          rationale: "コワーキングと自宅一人で明確な場所による差がある"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: {
        hypothesisId: "rst-h1",
        interventionId: "send-start-declaration",
        instruction: "開始前に『今から10分だけ始める』と一文送信する",
        observableResult: "送信後5分以内に開始できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "realistic-anxiety",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "realistic-anxiety",
      evidence: [
        {
          id: "ra-e1",
          kind: "reported_fact",
          statement: "完成条件は明確だった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "ra-e2",
          kind: "self_explanation",
          statement: "間違いが見つかりそうで怖いという失敗への不安があった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "ra-e3",
          kind: "reported_fact",
          statement: "提出物のファイルを開かなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["ra-e1", "ra-e3"],
      selfExplanationEvidenceIds: ["ra-e2"],
      hypotheses: [
        {
          id: "ra-h1",
          rank: 1,
          code: "anxiety_or_failure_avoidance",
          label: "失敗への不安による回避",
          supportEvidenceIds: ["ra-e2", "ra-e3"],
          counterEvidenceIds: ["ra-e1"],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "medium",
          rationale: "完成条件は明確だが、間違いを発見することへの不安でファイルを開けていない"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: {
        hypothesisId: "ra-h1",
        interventionId: "open-without-editing",
        instruction: "修正は禁止としてファイルを開き、最初の一画面だけ確認する",
        observableResult: "修正せずにファイルを開けたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "paraphrase-short",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "paraphrase-short",
      evidence: [
        {
          id: "ps-e1",
          kind: "reported_fact",
          statement: "選択過多で始められなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["ps-e1"],
      selfExplanationEvidenceIds: [],
      hypotheses: [
        {
          id: "ps-h1",
          rank: 1,
          code: "choice_overload",
          label: "選択過多",
          supportEvidenceIds: ["ps-e1"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: ["候補数と比較基準"],
          confidence: "provisional",
          rationale: "選択肢が多いことと未着手が直接報告されている"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: ["開始前に見えていた選択肢は何件くらいでしたか"],
      recommendedIntervention: {
        hypothesisId: "ps-h1",
        interventionId: "show-one-option",
        instruction: "候補を一件だけ表示する",
        observableResult: "一件表示後に着手できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "paraphrase-long",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "paraphrase-long",
      evidence: [
        {
          id: "pl-e1",
          kind: "reported_fact",
          statement: "最初にできる作業が五つあり、複数候補が見えていた",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "pl-e2",
          kind: "self_explanation",
          statement: "どれも重要に思えた",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "pl-e3",
          kind: "reported_fact",
          statement: "順番の比較中に停止し、どれにも着手しなかった",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["pl-e1", "pl-e3"],
      selfExplanationEvidenceIds: ["pl-e2"],
      hypotheses: [
        {
          id: "pl-h1",
          rank: 1,
          code: "choice_overload",
          label: "選択過多",
          supportEvidenceIds: ["pl-e1", "pl-e2", "pl-e3"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "medium",
          rationale: "複数候補を比較し続け、比較中に停止して未着手になっている"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: {
        hypothesisId: "pl-h1",
        interventionId: "deadline-first-choice",
        instruction: "最も締切が近い一件だけを最初の作業に固定する",
        observableResult: "固定後5分以内に開始できたか"
      },
      safety: normalSafety
    }
  },
  {
    testCaseId: "paraphrase-emotional",
    output: {
      analysisVersion: "self-manual-v2",
      episodeId: "paraphrase-emotional",
      evidence: [
        {
          id: "pe-e1",
          kind: "self_explanation",
          statement: "感情表現として『何からやればいいの』と混乱していた",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "pe-e2",
          kind: "self_explanation",
          statement: "全部大事に見え、嫌になった",
          source: "current_user_text",
          verification: "user_reported"
        },
        {
          id: "pe-e3",
          kind: "reported_fact",
          statement: "選択過多の状態で作業を閉じた",
          source: "current_user_text",
          verification: "user_reported"
        }
      ],
      factEvidenceIds: ["pe-e3"],
      selfExplanationEvidenceIds: ["pe-e1", "pe-e2"],
      hypotheses: [
        {
          id: "pe-h1",
          rank: 1,
          code: "choice_overload",
          label: "選択過多",
          supportEvidenceIds: ["pe-e1", "pe-e2", "pe-e3"],
          counterEvidenceIds: [],
          stateFactorEvidenceIds: [],
          unknowns: [],
          confidence: "medium",
          rationale: "全部が重要に見えて選択できず、作業を閉じた"
        }
      ],
      unresolvedContradictions: [],
      additionalQuestions: [],
      recommendedIntervention: {
        hypothesisId: "pe-h1",
        interventionId: "restore-one-item",
        instruction: "閉じた画面から先頭の一件だけを再表示する",
        observableResult: "一件だけの状態で再開できたか"
      },
      safety: normalSafety
    }
  }
];
