import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import { cue } from "../../audio";
import { DecreeHead } from "../../components/DecreeHead";
import { useReducedMotion } from "../../components/useReducedMotion";
import { atlasCopy, places } from "../../content/atlas";
import type { Place } from "../../content/atlas";
import { useSiteStore } from "../../state/context";
import { Dossier, DangerScale } from "./Dossier";
import { dangerWord, SurveyMap } from "./SurveyMap";
import { gridRef } from "./view";
import styles from "./atlas.module.css";

const GAZETTEER = "Gazetteer of the Land";
/** Reading a dossier is noticed. The worse the place, the more it is noticed. */
const ATTENTION_PER_DANGER = 0.4;

export default function Atlas(): React.JSX.Element {
  const store = useSiteStore();
  const reduced = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const selected = places.find((place) => place.id === params.get("place")) ?? null;
  const survey = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const moveFocus = useRef(false);

  // A deep link lands on the sheet, not on the page head above it.
  useEffect(() => {
    if (selected) survey.current?.scrollIntoView({ block: "start" });
    // Only the address the page was opened with, hence no dependencies.
  }, []);

  useEffect(() => {
    if (!selected || !moveFocus.current) return;
    moveFocus.current = false;
    heading.current?.focus();
  }, [selected]);

  const open = useCallback(
    (place: Place) => {
      origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      moveFocus.current = true;
      setParams({ place: place.id }, { replace: true });
      store.raiseAttention(place.danger * ATTENTION_PER_DANGER);
      if (place.danger === 5) cue("detected");
    },
    [setParams, store],
  );

  const close = useCallback(() => {
    const returnTo = selected
      ? document.querySelector<HTMLElement>(`[data-place="${selected.id}"]`)
      : null;
    setParams({}, { replace: true });
    const target = origin.current?.isConnected ? origin.current : returnTo;
    target?.focus({ preventScroll: true });
  }, [selected, setParams]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape" && selected) {
      event.stopPropagation();
      close();
    }
  }

  return (
    <div className={styles.page}>
      <DecreeHead file="Bureau of Survey" title={atlasCopy.title}>
        <p>{atlasCopy.intro}</p>
      </DecreeHead>

      <section ref={survey} className={styles.survey} aria-label={atlasCopy.title} onKeyDown={onKeyDown}>
        <SurveyMap selected={selected} reduced={reduced} onSelect={open} />
        <Dossier place={selected} headingRef={heading} onClose={close} />
      </section>

      <section className={styles.gazetteer} aria-labelledby="gazetteer">
        <h2 id="gazetteer" className={styles.gazetteerTitle}>
          {GAZETTEER}
        </h2>
        <ol className={styles.register}>
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className={styles.entry}
                aria-pressed={place.id === selected?.id}
                aria-label={`${place.name}, ${place.kind}. ${atlasCopy.dangerLabel} ${place.danger} of 5: ${dangerWord(place)}`}
                onClick={() => {
                  open(place);
                  survey.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
                }}
              >
                <span className={styles.entryRef}>{gridRef(place)}</span>
                <span className={styles.entryName}>{place.name}</span>
                <span className={styles.entryKind}>{place.kind}</span>
                <span className={styles.entryDanger}>
                  <DangerScale danger={place.danger} compact />
                  {dangerWord(place)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
