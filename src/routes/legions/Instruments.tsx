import { legionsCopy } from "../../content/legions";
import type { LegionDossier, LegionRatings } from "../../content/legions";
import { RATING_KEYS } from "./filter";
import { MARK_HEIGHT, MARK_WIDTH, markPath } from "./mark";
import styles from "./legions.module.css";

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

function describe(name: string, ratings: LegionRatings): string {
  const parts = RATING_KEYS.map((key) => `${legionsCopy.ratingLabels[key]} ${ratings[key]} of 10`);
  return `${name}: ${parts.join(", ")}`;
}

export function Brand({ id, className }: { id: string; className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`} aria-hidden="true" focusable="false">
      <path d={`M${MARK_WIDTH / 2 - 1} 2h2v${MARK_HEIGHT - 4}h-2Z`} fill="currentColor" />
      <path d={markPath(id)} fill="currentColor" />
    </svg>
  );
}

/** One row of ten slots, cut through an iron plate. Struck slots show the fire under the Directorate. */
function Slots({ value, reverse = false, hollow = false }: { value: number; reverse?: boolean; hollow?: boolean }): React.JSX.Element {
  return (
    <span className={styles.slots} data-reverse={reverse || undefined}>
      {SCALE.map((step) => (
        <i
          key={step}
          data-state={step === value ? (hollow ? "hollow" : "punched") : step < value ? "under" : undefined}
        />
      ))}
    </span>
  );
}

/** The service card: four ratings punched into a ten-point plate, with the trace that joins them. */
export function ServiceCard({ file }: { file: LegionDossier }): React.JSX.Element {
  const points = RATING_KEYS.map(
    (key, row) => `${(file.ratings[key] - 0.5) * 10},${(row + 0.5) * 25}`,
  ).join(" ");
  return (
    <div className={styles.card} role="img" aria-label={describe(file.name, file.ratings)}>
      <div className={styles.cardRows}>
        <svg className={styles.trace} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        {RATING_KEYS.map((key) => (
          <div key={key} className={styles.cardRow}>
            <span className={styles.ratingName}>{legionsCopy.ratingLabels[key]}</span>
            <Slots value={file.ratings[key]} />
            <span className={styles.ratingValue}>{file.ratings[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Miniature of the same trace, for the index: every file has a recognisable profile. */
export function Trace({ ratings }: { ratings: LegionRatings }): React.JSX.Element {
  const points = RATING_KEYS.map((key, row) => `${(ratings[key] / 10) * 60},${3 + row * 8}`).join(" ");
  return (
    <svg className={styles.miniTrace} viewBox="0 0 62 30" aria-hidden="true" focusable="false">
      <path d="M6 0V30M18 0V30M30 0V30M42 0V30M54 0V30" className={styles.miniGrid} />
      <polyline points={points} fill="none" />
    </svg>
  );
}

/** Mirrored comparison: two scales run outward from one column of names, so the longer reach wins. */
export function ComparativeCard({ left, right }: { left: LegionDossier; right: LegionDossier }): React.JSX.Element {
  return (
    <div
      className={styles.compareCard}
      role="img"
      aria-label={`${describe(left.name, left.ratings)}. ${describe(right.name, right.ratings)}`}
    >
      {RATING_KEYS.map((key) => {
        const a = left.ratings[key];
        const b = right.ratings[key];
        return (
          <div key={key} className={styles.compareRow}>
            <span className={styles.compareValue} data-lead={a > b || undefined}>{a}</span>
            <Slots value={a} reverse />
            <span className={styles.compareName}>{legionsCopy.ratingLabels[key]}</span>
            <Slots value={b} hollow />
            <span className={styles.compareValue} data-lead={b > a || undefined}>{b}</span>
          </div>
        );
      })}
    </div>
  );
}
