import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Seal } from "../../components/Seal";
import { useReducedMotion } from "../../components/useReducedMotion";
import { entryCards, headings, hero, heroControl, proclamations, realmFigures } from "../../content/threshold";
import { EyeCanvas } from "./EyeCanvas";
import { EyeStatic } from "./EyeStatic";
import styles from "./threshold.module.css";

const LINE_MS = 7000;

function fileNumber(index: number): string {
  return `No. ${String(index + 1).padStart(3, "0")}`;
}

export default function Threshold(): React.JSX.Element {
  const reduced = useReducedMotion();
  const [glFailed, setGlFailed] = useState(false);
  const [line, setLine] = useState(0);
  const [held, setHeld] = useState(false);
  const descent = useRef<HTMLElement>(null);
  const onFail = useCallback(() => setGlFailed(true), []);

  useEffect(() => {
    if (reduced || held) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setLine((value) => (value + 1) % hero.lines.length);
    }, LINE_MS);
    return () => window.clearInterval(timer);
  }, [reduced, held]);

  const latest = proclamations[proclamations.length - 1]!;
  const earlier = proclamations.slice(0, -1).reverse();

  return (
    <div className={styles.page}>
      <section className={styles.hero} data-eye>
        {reduced || glFailed ? <EyeStatic /> : <EyeCanvas onFail={onFail} />}
        <div className={styles.heroBody}>
          <p className={styles.eyebrow}>{hero.eyebrow}</p>
          <h1 className={styles.title}>{hero.title}</h1>
          <div className={styles.heroFoot}>
            <ul className={styles.lines} data-static={reduced || undefined}>
              {hero.lines.map((text, index) => (
                <li key={text} data-active={index === line || undefined}>
                  {text}
                </li>
              ))}
            </ul>
            <div className={styles.heroActions}>
              {reduced ? null : (
                <button type="button" className={styles.hold} onClick={() => setHeld((value) => !value)}>
                  {held ? heroControl.resume : heroControl.pause}
                </button>
              )}
              <button
                type="button"
                className={styles.descend}
                onClick={() =>
                  descent.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" })
                }
              >
                {hero.scrollHint}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section ref={descent} className={styles.section} aria-labelledby="proclamations">
        <header className={styles.sectionHead}>
          <h2 id="proclamations" className={styles.sectionTitle}>
            {headings.proclamationsTitle}
          </h2>
          <p className={styles.sectionIntro}>{headings.proclamationsIntro}</p>
        </header>

        <article className={styles.decree} data-surface="decree">
          <p className={styles.decreeFile}>
            {fileNumber(proclamations.length - 1)}. {latest.issuer}. {latest.date}
          </p>
          <h3 className={styles.decreeTitle}>{latest.title}</h3>
          <p className={styles.decreeBody}>{latest.body}</p>
          <Seal size={132} className={styles.decreeSeal} />
        </article>

        <ol className={styles.ledger}>
          {earlier.map((item) => (
            <li key={item.id} className={styles.entry}>
              <p className={styles.entryFile}>
                <span>{fileNumber(proclamations.indexOf(item))}</span>
                <span>{item.date}</span>
                <span>{item.issuer}</span>
              </p>
              <div className={styles.entryBody}>
                <h3 className={styles.entryTitle}>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="realm">
        <header className={styles.sectionHead}>
          <h2 id="realm" className={styles.sectionTitle}>
            {headings.realmTitle}
          </h2>
          <p className={styles.sectionIntro}>{headings.realmIntro}</p>
        </header>
        <dl className={styles.figures}>
          {realmFigures.map((figure) => (
            <div key={figure.id} className={styles.figure}>
              <dt>{figure.label}</dt>
              <dd className={styles.figureValue}>{figure.value}</dd>
              <dd className={styles.figureNote}>{figure.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="entries">
        <header className={styles.sectionHead}>
          <h2 id="entries" className={styles.sectionTitle}>
            {headings.entriesTitle}
          </h2>
          <p className={styles.sectionIntro}>{headings.entriesIntro}</p>
        </header>
        <ul className={styles.departments}>
          {entryCards.map((card) => (
            <li key={card.route}>
              <Link to={card.path} className={styles.department}>
                <span className={styles.departmentKicker}>{card.kicker}</span>
                <span className={styles.departmentTitle}>{card.title}</span>
                <span className={styles.departmentBlurb}>{card.blurb}</span>
                <span className={styles.departmentAction}>{card.action}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
