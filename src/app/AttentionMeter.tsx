import { useId, useState } from "react";
import { meterTitle } from "../content/eye";
import { useSiteState } from "../state/context";
import { levelFor } from "./meter";
import styles from "./Controls.module.css";

export function AttentionMeter({ observation }: { observation: string | null }): React.JSX.Element {
  const percent = useSiteState((s) => Math.floor(s.attention));
  const threshold = useSiteState((s) => levelFor(s.attention).threshold);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const level = levelFor(threshold);

  return (
    <div className={styles.meter}>
      <button
        type="button"
        className={styles.meterButton}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${meterTitle}: ${percent}% ${level.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.meterTitle}>{meterTitle}</span>
        <span className={styles.meterReading}>
          <span className={styles.meterNumber}>{percent}%</span>
          <span className={styles.meterLabel}>{level.label}</span>
        </span>
        <span className={styles.meterBar}>
          <span className={styles.meterFill} style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
      </button>
      <div id={panelId} className={styles.meterPanel} hidden={!open}>
        <p className={styles.panelLevel}>{level.label}</p>
        <p>{level.description}</p>
        {observation ? <p className={styles.panelNote}>{observation}</p> : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {`${meterTitle}: ${level.label}`}
      </p>
    </div>
  );
}
