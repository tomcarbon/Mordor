import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { cue } from "../../audio";
import { DecreeHead } from "../../components/DecreeHead";
import { useReducedMotion } from "../../components/useReducedMotion";
import { musterCopy, questions, stations } from "../../content/muster";
import type { Station } from "../../content/muster";
import { useSiteStore } from "../../state/context";
import { fillTokens } from "../_shared/fillTokens";
import { determineStation } from "./scoring";
import type { Answers } from "./scoring";
import { Writ } from "./Writ";
import { drawWrit, writBlob, writText } from "./writCanvas";
import type { WritInk } from "./writCanvas";
import styles from "./muster.module.css";

const WRIT_ISSUED_RISE = 4;
const NAME_LIMIT = 80;
// Not in the content module yet. Flagged to WO-0001.2 in the deliverable.
const DOWNLOAD_FAILED = "The Writ could not be drawn. The obligation stands regardless.";

function Tally({ done }: { done: number }): React.JSX.Element {
  return (
    <span className={styles.tally} aria-hidden="true">
      {questions.map((question, index) => (
        <i key={question.id} data-state={index < done ? "done" : index === done ? "now" : undefined} />
      ))}
    </span>
  );
}

function readInk(element: HTMLElement): WritInk {
  const styleOf = getComputedStyle(element);
  const read = (name: string) => styleOf.getPropertyValue(name).trim();
  return {
    stock: read("--c-decree-bg"),
    ink: read("--c-decree-ink"),
    muted: read("--c-decree-muted"),
    stamp: read("--c-decree-stamp"),
  };
}

function Issued({ station, onRetake }: { station: Station; onRetake(): void }): React.JSX.Element {
  // The name lives here and nowhere else: not in the URL, not in storage, not in the store.
  const [name, setName] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const document_ = useRef<HTMLElement>(null);
  const text = writText(name, station);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function download(): Promise<void> {
    if (!document_.current || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const canvas = document.createElement("canvas");
      await drawWrit(canvas, text, station, readInk(document_.current));
      const url = URL.createObjectURL(await writBlob(canvas));
      const link = document.createElement("a");
      link.href = url;
      link.download = `writ-of-service-${station.id}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      cue("stamp");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.issued} aria-labelledby="determination">
      <div className={styles.determination}>
        <p className={styles.stampLine}>{musterCopy.resultHeading}</p>
        <h2 id="determination" ref={heading} tabIndex={-1} className={styles.stationTitle}>
          {station.title}
        </h2>
        <p className={styles.duties}>{station.duties}</p>
        <div className={styles.field}>
          <label htmlFor="recruit">{musterCopy.nameLabel}</label>
          <input
            id="recruit"
            type="text"
            value={name}
            maxLength={NAME_LIMIT}
            placeholder={musterCopy.namePlaceholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => setName(event.target.value)}
          />
          <p className={styles.notice}>{musterCopy.nameNotice}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => void download()}>
            {musterCopy.downloadLabel}
          </button>
          <button type="button" className={styles.secondary} onClick={onRetake}>
            {musterCopy.retakeLabel}
          </button>
        </div>
        {failed ? <p role="alert">{DOWNLOAD_FAILED}</p> : null}
        <p className={styles.notice}>{musterCopy.retakeNote}</p>
      </div>
      <Writ ref={document_} text={text} station={station} />
    </section>
  );
}

export default function Muster(): React.JSX.Element {
  const store = useSiteStore();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [station, setStation] = useState<Station | null>(null);
  const [attempt, setAttempt] = useState(0);
  const desk = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const question = step === null ? null : questions[step];
  const chosen = question ? answers[question.id] : undefined;

  useEffect(() => {
    if (step === null) return;
    form.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: step === 0 });
    if (step === 0) desk.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [step, reduced]);

  function choose(answerId: string): void {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: answerId }));
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (step === null || !chosen) return;
    if (step + 1 < questions.length) {
      setStep(step + 1);
      return;
    }
    setStation(determineStation(stations, questions, answers));
    setStep(null);
    store.raiseAttention(WRIT_ISSUED_RISE);
    cue("stamp");
    desk.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (!question || event.ctrlKey || event.metaKey || event.altKey) return;
    const answer = question.answers[Number(event.key) - 1];
    if (!answer) return;
    event.preventDefault();
    choose(answer.id);
    form.current?.querySelector<HTMLInputElement>(`input[value="${answer.id}"]`)?.focus();
  }

  function retake(): void {
    setStation(null);
    setAnswers({});
    setAttempt((value) => value + 1);
    setStep(0);
  }

  return (
    <div className={styles.page}>
      <DecreeHead file="Office of Musters" title={musterCopy.title}>
        <p>{musterCopy.intro}</p>
      </DecreeHead>

      <div ref={desk} className={styles.desk}>
        {step === null && !station ? (
          <div className={styles.begin}>
            <Tally done={-1} />
            <button type="button" className={styles.primary} onClick={() => setStep(0)}>
              {musterCopy.beginLabel}
            </button>
          </div>
        ) : null}

        {question && step !== null ? (
          <form ref={form} key={`${attempt}-${question.id}`} className={styles.examination} onSubmit={submit} onKeyDown={onKeyDown}>
            <div className={styles.margin}>
              <p className={styles.stampLine} aria-live="polite">
                {fillTokens(musterCopy.progressLabel, { current: step + 1, total: questions.length })}
              </p>
              <Tally done={step} />
            </div>
            <fieldset className={styles.question}>
              <legend className={styles.prompt}>{question.prompt}</legend>
              {question.answers.map((answer, index) => (
                <label key={answer.id} className={styles.answer} data-chosen={chosen === answer.id || undefined}>
                  <input
                    type="radio"
                    name="answer"
                    value={answer.id}
                    checked={chosen === answer.id}
                    onChange={() => choose(answer.id)}
                  />
                  <span className={styles.answerKey} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{answer.text}</span>
                </label>
              ))}
              <button type="submit" className={styles.primary} disabled={!chosen}>
                {musterCopy.nextLabel}
              </button>
            </fieldset>
          </form>
        ) : null}

        {station ? <Issued key={attempt} station={station} onRetake={retake} /> : null}
      </div>
    </div>
  );
}
