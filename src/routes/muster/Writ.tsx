import { forwardRef } from "react";
import { Seal } from "../../components/Seal";
import { writ } from "../../content/muster";
import type { Station } from "../../content/muster";
import type { WritText } from "./writCanvas";
import styles from "./muster.module.css";

export interface WritProps {
  text: WritText;
  station: Station;
}

/** The document itself, as text. The download repeats this composition on canvas. */
export const Writ = forwardRef<HTMLElement, WritProps>(function Writ({ text, station }, ref) {
  return (
    <article ref={ref} className={styles.writ} data-surface="decree" aria-labelledby="writ-title">
      <p className={styles.writOffice}>{writ.office}</p>
      <h3 id="writ-title" className={styles.writTitle}>
        {writ.title}
      </h3>
      <p className={styles.writPreamble}>{text.preamble}</p>
      <p className={styles.writStation}>{station.title}</p>
      <ol className={styles.writClauses}>
        {text.clauses.map((clause) => (
          <li key={clause}>{clause}</li>
        ))}
      </ol>
      <p className={styles.writClosing}>{text.closing}</p>
      <div className={styles.writFoot}>
        <div>
          <p className={styles.writDate}>{writ.dateLine}</p>
          <p className={styles.writSignature}>{writ.signature}</p>
        </div>
        <figure className={styles.writSeal}>
          <Seal size={132} />
          <figcaption>{writ.sealText}</figcaption>
        </figure>
      </div>
    </article>
  );
});
