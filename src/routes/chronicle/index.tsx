import { useEffect, useRef, useState } from "react";
import { cue } from "../../audio";
import { DecreeHead } from "../../components/DecreeHead";
import { Seal } from "../../components/Seal";
import { useReducedMotion } from "../../components/useReducedMotion";
import { chronicle, chronicleCopy } from "../../content/chronicle";
import { useSiteStore } from "../../state/context";
import { absoluteYear, formatYear, gapRem, heatAt, yearAt } from "./scale";
import styles from "./chronicle.module.css";

const RISE_ON_THE_REFUSAL = 3;
const LEDGER_LINES = 9;
const MAX_TICKS = 18;

const closing = chronicle[chronicle.length - 1]!;
const dated = chronicle.slice(0, -1);

function splitYear(year: string): { prefix: string; figure: string } {
  const match = /^(.*?)(\d+)(.*)$/.exec(year);
  if (!match) return { prefix: "", figure: year };
  return { prefix: `${match[1]}${match[3]!.replace(/^,\s*/, "")}`.trim(), figure: match[2]! };
}

function yearsBetween(index: number): number {
  const previous = chronicle[index - 1];
  return previous ? absoluteYear(chronicle[index]!.year) - absoluteYear(previous.year) : 0;
}

function Gap({ index }: { index: number }): React.JSX.Element {
  const years = yearsBetween(index);
  const ticks = Math.min(MAX_TICKS, Math.floor(years / 100));
  return (
    <div className={styles.gap} style={{ "--gap": `${gapRem(years)}rem` } as React.CSSProperties} aria-hidden="true">
      <span className={styles.ticks}>
        {Array.from({ length: ticks }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      {years >= 400 ? <span className={styles.span}>{years.toLocaleString("en-GB")} years</span> : null}
    </div>
  );
}

export default function Chronicle(): React.JSX.Element {
  const store = useSiteStore();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const heat = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const refusal = useRef<HTMLElement>(null);
  const noticed = useRef(false);
  const [sealed, setSealed] = useState(false);

  // Scroll is read once a frame and written straight to the DOM: nothing here re-renders React.
  useEffect(() => {
    const entries = [...(root.current?.querySelectorAll<HTMLElement>("[data-entry]") ?? [])];
    let frame = 0;
    function update(): void {
      frame = 0;
      const middle = window.innerHeight * 0.55;
      const tops = entries.map((entry) => entry.getBoundingClientRect().top);
      let index = -1;
      tops.forEach((top, i) => {
        if (top <= middle) index = i;
      });
      const first = tops[0] ?? 0;
      const last = tops[tops.length - 1] ?? 1;
      const nextTop = tops[index + 1];
      const hereTop = tops[index];
      const within =
        index < 0 || nextTop === undefined || hereTop === undefined || reduced
          ? 0
          : (middle - hereTop) / (nextTop - hereTop);
      const depth = (middle - first) / (last - first);
      const out = (middle - last) / (window.innerHeight * 0.5);
      const level = heatAt(depth, out);
      heat.current?.style.setProperty("--heat", (reduced ? Math.round(level * 4) / 4 : level).toFixed(3));
      if (readout.current) {
        const year = formatYear(yearAt(chronicle, Math.max(0, index), Math.max(0, within)));
        if (readout.current.textContent !== year) readout.current.textContent = year;
      }
      root.current?.setAttribute("data-passed", String(Math.max(0, index)));
    }
    function request(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [reduced]);

  // Entries are lowered into place once. Without an observer, or with reduced motion, they just are.
  useEffect(() => {
    const element = root.current;
    if (!element || reduced || typeof IntersectionObserver !== "function") return undefined;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          record.target.setAttribute("data-seen", "");
          observer.unobserve(record.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    element.setAttribute("data-armed", "");
    element.querySelectorAll("[data-entry]").forEach((entry) => observer.observe(entry));
    return () => observer.disconnect();
  }, [reduced]);

  // The Eye notices who reads to the end. Once.
  useEffect(() => {
    const element = refusal.current;
    if (!element || typeof IntersectionObserver !== "function") {
      setSealed(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([record]) => {
        if (!record?.isIntersecting || noticed.current) return;
        noticed.current = true;
        setSealed(true);
        store.raiseAttention(RISE_ON_THE_REFUSAL);
        cue("stamp");
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [store]);

  return (
    <div ref={root} className={styles.page}>
      <div ref={heat} className={styles.heat} aria-hidden="true" />

      <DecreeHead file="Ministry of Record" title={chronicleCopy.title}>
        <p>{chronicleCopy.intro}</p>
      </DecreeHead>

      <p ref={readout} className={styles.readout} aria-hidden="true">
        {chronicle[0] ? formatYear(absoluteYear(chronicle[0].year)) : ""}
      </p>

      <ol className={styles.shaft}>
        {dated.map((entry, index) => {
          const { prefix, figure } = splitYear(entry.year);
          const newAge = dated[index - 1]?.era !== entry.era;
          return (
            <li key={entry.id} className={styles.stage}>
              {index > 0 ? <Gap index={index} /> : null}
              {newAge ? <h2 className={styles.era}>{entry.era}</h2> : null}
              <article
                data-entry
                className={styles.entry}
                style={{ "--step": index } as React.CSSProperties}
              >
                <p className={styles.year}>
                  <span className={styles.yearFigure}>{figure}</span>
                  <span className={styles.yearPrefix}>{prefix}</span>
                </p>
                <div className={styles.body}>
                  <h3 className={styles.title}>{entry.title}</h3>
                  <p>{entry.text}</p>
                </div>
              </article>
            </li>
          );
        })}
        <li className={styles.stage}>
          <Gap index={chronicle.length - 1} />
          <article ref={refusal} data-entry className={styles.refusal} data-surface="decree">
            <p className={styles.refusalYear}>{closing.year}</p>
            <h2 className={styles.refusalTitle}>{closing.title}</h2>
            <p className={styles.refusalText}>{closing.text}</p>
            <div className={styles.redactions} aria-hidden="true">
              <i style={{ inlineSize: "92%" }} />
              <i style={{ inlineSize: "78%" }} />
              <i style={{ inlineSize: "85%" }} />
              <i style={{ inlineSize: "41%" }} />
            </div>
            <div className={styles.seal} data-landed={sealed || undefined}>
              <Seal size={132} />
            </div>
          </article>
        </li>
      </ol>

      <div className={styles.ledger} aria-hidden="true">
        {Array.from({ length: LEDGER_LINES }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <p className={styles.closing}>{chronicleCopy.closing}</p>
    </div>
  );
}
