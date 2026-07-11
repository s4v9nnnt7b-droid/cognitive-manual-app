"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./simple.module.css";
import {
  makeShareText,
  questions,
  scaleOptions,
  scoreDiagnosis,
  typeDefinitions,
  type Answers,
  type AxisConfidence,
  type DiagnosisResult
} from "@/src/lib/simple-diagnosis";

const STORAGE_KEY = "self-manual-simple-v01";

type Phase = "intro" | "questions" | "result";

const confidenceLabels: Record<AxisConfidence, string> = {
  high: "安定",
  medium: "やや変動",
  low: "場面差あり",
  unrated: "未判定"
};

const resultConfidenceLabels: Record<DiagnosisResult["resultConfidence"], string> = {
  high: "確信度 高",
  medium: "確信度 中",
  low: "確信度 低"
};

const tendencyLabels: Record<DiagnosisResult["tendency"], string> = {
  strong: "タイプ傾向が強め",
  medium: "タイプ傾向あり",
  balanced: "バランス型",
  hybrid: "ハイブリッド型"
};

export default function SimpleDiagnosisPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { answers?: Answers; currentIndex?: number; phase?: Phase };
        setAnswers(saved.answers ?? {});
        setCurrentIndex(Math.min(saved.currentIndex ?? 0, questions.length - 1));
        if (saved.phase === "result" && Object.keys(saved.answers ?? {}).length === questions.length) {
          setPhase("result");
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, currentIndex, phase }));
  }, [answers, currentIndex, hydrated, phase]);

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] != null).length,
    [answers]
  );
  const result = useMemo(() => scoreDiagnosis(answers), [answers]);
  const question = questions[currentIndex];
  const selectedValue = question ? answers[question.id] : undefined;
  const optionLabels = question?.options ?? scaleOptions;
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  function startDiagnosis() {
    const firstUnanswered = questions.findIndex((item) => answers[item.id] == null);
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    setPhase(firstUnanswered < 0 && answeredCount === questions.length ? "result" : "questions");
    setNotice("");
  }

  function chooseAnswer(value: number) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
    setNotice("");
  }

  function goNext() {
    if (!question || selectedValue == null) {
      setNotice("回答を1つ選んでください。");
      return;
    }
    if (currentIndex === questions.length - 1) {
      if (answeredCount < questions.length) {
        const firstUnanswered = questions.findIndex((item) => answers[item.id] == null);
        setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
        setNotice("未回答の質問があります。");
        return;
      }
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentIndex((index) => index + 1);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (currentIndex === 0) {
      setPhase("intro");
      return;
    }
    setCurrentIndex((index) => index - 1);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    window.localStorage.removeItem(STORAGE_KEY);
    setAnswers({});
    setCurrentIndex(0);
    setPhase("intro");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function shareResult() {
    const text = makeShareText(result);
    try {
      if (navigator.share) {
        await navigator.share({ title: "自分取説タイプ", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setNotice("結果をコピーしました。");
    } catch {
      setNotice("共有をキャンセルしました。");
    }
  }

  if (phase === "intro") {
    return (
      <main className={styles.shell}>
        <section className={styles.introCard}>
          <div className={styles.brandRow}>
            <span className={styles.logo}>取</span>
            <div>
              <p className={styles.eyebrow}>SELF MANUAL LITE</p>
              <b>自分取説・かんたんタイプ診断</b>
            </div>
          </div>

          <div className={styles.heroSymbol} aria-hidden="true">🧭</div>
          <h1>自分の強みが出る条件を、5分で見つける。</h1>
          <p className={styles.lead}>
            28問から8つの特性軸を整理し、主タイプ・副タイプと、仕事、スポーツ、趣味、人間関係での活かし方を表示します。
          </p>

          <div className={styles.featureGrid}>
            <div><strong>28問</strong><span>約5〜7分</span></div>
            <div><strong>8軸</strong><span>強みと負荷</span></div>
            <div><strong>2タイプ</strong><span>主＋副</span></div>
          </div>

          <div className={styles.noticeBox}>
            <b>この診断について</b>
            <p>医療診断、発達障害判定、能力検査ではありません。結果は自己理解のための仮説として扱ってください。</p>
          </div>

          <button type="button" className={styles.primaryButton} onClick={startDiagnosis}>
            {answeredCount > 0 ? `続きから始める（${answeredCount}/28）` : "診断を始める"}
          </button>
          {answeredCount > 0 ? (
            <button type="button" className={styles.textButton} onClick={restart}>保存済みの回答を消す</button>
          ) : null}
          <Link className={styles.backLink} href="/">詳細な認知書アプリへ戻る</Link>
        </section>
      </main>
    );
  }

  if (phase === "questions" && question) {
    return (
      <main className={styles.shell}>
        <header className={styles.questionHeader}>
          <button type="button" className={styles.iconButton} onClick={goBack} aria-label="前へ戻る">←</button>
          <div>
            <p className={styles.eyebrow}>QUESTION {currentIndex + 1} / {questions.length}</p>
            <b>{currentIndex < 24 ? "特性チェック" : "実体験チェック"}</b>
          </div>
          <span className={styles.savedLabel}>{answeredCount}回答</span>
        </header>

        <div className={styles.progressTrack} aria-label={`進捗 ${progress}%`}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>

        <section className={styles.questionCard}>
          <span className={styles.questionNumber}>Q{String(currentIndex + 1).padStart(2, "0")}</span>
          <h1>{question.text}</h1>
          <div className={styles.answerList}>
            {optionLabels.map((label, index) => {
              const value = index + 1;
              const selected = selectedValue === value;
              return (
                <button
                  type="button"
                  key={label}
                  className={`${styles.answerButton} ${selected ? styles.answerSelected : ""}`}
                  aria-pressed={selected}
                  onClick={() => chooseAnswer(value)}
                >
                  <span className={styles.answerIndex}>{value}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          {notice ? <p className={styles.errorText} role="alert">{notice}</p> : null}
        </section>

        <div className={styles.questionActions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>戻る</button>
          <button type="button" className={styles.primaryButton} onClick={goNext} disabled={selectedValue == null}>
            {currentIndex === questions.length - 1 ? "結果を見る" : "次へ"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.resultShell}>
      <header className={styles.resultTopbar}>
        <Link href="/simple" className={styles.iconLink} aria-label="診断トップへ">取</Link>
        <div>
          <p className={styles.eyebrow}>YOUR SELF MANUAL</p>
          <b>診断結果</b>
        </div>
        <button type="button" className={styles.shareButton} onClick={shareResult}>共有</button>
      </header>

      <section className={styles.resultHero}>
        <div className={styles.resultSymbols} aria-hidden="true">
          <span>{result.primary.symbol}</span>
          <span>{result.secondary.symbol}</span>
        </div>
        <span className={styles.resultChip}>{tendencyLabels[result.tendency]}</span>
        <h1>{result.displayName}</h1>
        <p>{result.primary.tagline}</p>
        <div className={styles.typePair}>
          <div><small>主タイプ</small><strong>{result.primary.label}</strong><span>{Math.round(result.typeScores[result.primaryType])}%</span></div>
          <div><small>副タイプ</small><strong>{result.secondary.label}</strong><span>{Math.round(result.typeScores[result.secondaryType])}%</span></div>
        </div>
        <div className={styles.confidenceRow}>
          <span>{resultConfidenceLabels[result.resultConfidence]}</span>
          {result.stateTags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </section>

      <section className={styles.resultSection}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>8 TRAITS</p><h2>あなたの特性軸</h2></div>
          <small>0〜100</small>
        </div>
        <div className={styles.axisList}>
          {result.axes.map((axis) => (
            <article className={styles.axisCard} key={axis.key}>
              <div className={styles.axisHeading}>
                <div><strong>{axis.label}</strong><span>{axis.poleLabel}</span></div>
                <b>{axis.score}</b>
              </div>
              <div className={styles.axisTrack}><div style={{ width: `${axis.score}%` }} /></div>
              <p>{axis.summary}</p>
              <small>{confidenceLabels[axis.confidence]}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.resultSection}>
        <p className={styles.eyebrow}>STRENGTH & LOAD</p>
        <h2>強みと負荷条件</h2>
        <div className={styles.twoColumnCards}>
          <article className={styles.goodCard}>
            <h3>力が出やすい</h3>
            <ul>{uniqueItems(result.primary.strengths, result.secondary.strengths).map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.loadCard}>
            <h3>負荷になりやすい</h3>
            <ul>{uniqueItems(result.primary.loads, result.secondary.loads).map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.resultSection}>
        <p className={styles.eyebrow}>SCENE GUIDE</p>
        <h2>場面別の自分取説</h2>
        <div className={styles.sceneGrid}>
          <SceneCard icon="💼" title="仕事・勉強" items={uniqueItems(result.primary.work, result.secondary.work)} />
          <SceneCard icon="⚽" title="スポーツ" items={uniqueItems(result.primary.sports, result.secondary.sports)} />
          <SceneCard icon="🎨" title="趣味" items={uniqueItems(result.primary.hobbies, result.secondary.hobbies)} />
          <SceneCard icon="🤝" title="人間関係" items={uniqueItems(result.primary.relationships, result.secondary.relationships)} />
        </div>
      </section>

      <section className={styles.resultSection}>
        <p className={styles.eyebrow}>WHY THIS RESULT</p>
        <h2>この結果の読み方</h2>
        <p className={styles.bodyText}>{result.primary.description}</p>
        <p className={styles.bodyText}>副タイプの「{result.secondary.label}」の特徴も組み合わさるため、場面によって両方の動き方が出ます。</p>
        {result.resultConfidence === "low" ? (
          <div className={styles.noticeBox}>
            <b>結果が揺れやすい可能性があります</b>
            <p>体調や役割によって回答が変わる可能性があります。別の日にもう一度回答し、共通して出る特徴を見てください。</p>
          </div>
        ) : null}
      </section>

      <section className={styles.resultSection}>
        <p className={styles.eyebrow}>ALL TYPES</p>
        <h2>8タイプの適合度</h2>
        <div className={styles.typeScoreList}>
          {[...Object.keys(typeDefinitions) as Array<keyof typeof typeDefinitions>]
            .sort((left, right) => result.typeScores[right] - result.typeScores[left])
            .map((typeId) => (
              <div key={typeId}>
                <span>{typeDefinitions[typeId].symbol} {typeDefinitions[typeId].label}</span>
                <b>{Math.round(result.typeScores[typeId])}</b>
              </div>
            ))}
        </div>
      </section>

      <section className={styles.disclaimer}>
        <b>注意</b>
        <p>結果は優劣や適職を断定するものではありません。環境との相性を考えるための仮説です。質問・採点ロジックは初期版であり、今後のモニター検証で更新します。</p>
      </section>

      {notice ? <p className={styles.toast} role="status">{notice}</p> : null}

      <div className={styles.resultActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => { setPhase("questions"); setCurrentIndex(0); }}>回答を見直す</button>
        <button type="button" className={styles.primaryButton} onClick={restart}>最初から</button>
      </div>
      <Link className={styles.backLink} href="/">詳細な認知書アプリを見る</Link>
    </main>
  );
}

function uniqueItems(primary: string[], secondary: string[]): string[] {
  return [...new Set([...primary, ...secondary])].slice(0, 4);
}

function SceneCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <article className={styles.sceneCard}>
      <span className={styles.sceneIcon} aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}
