import type { RefObject } from "react";
import { atlasCopy } from "../../content/atlas";
import type { DangerRating, Place } from "../../content/atlas";
import { Seal } from "../../components/Seal";
import { gridRef } from "./view";
import styles from "./atlas.module.css";

const LEVELS: DangerRating[] = [1, 2, 3, 4, 5];

/** Five notches cut deeper as they climb. The number and word always travel with it. */
export function DangerScale({ danger, compact = false }: { danger: DangerRating; compact?: boolean }): React.JSX.Element {
  return (
    <span className={styles.scale} data-compact={compact || undefined} aria-hidden="true">
      {LEVELS.map((level) => (
        <i key={level} data-on={level <= danger || undefined} style={{ blockSize: `${36 + level * 12.8}%` }} />
      ))}
    </span>
  );
}

export interface DossierProps {
  place: Place | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose(): void;
}

export function Dossier({ place, headingRef, onClose }: DossierProps): React.JSX.Element {
  if (!place) {
    return (
      <aside className={styles.dossier} data-empty>
        <Seal size={96} decorative className={styles.dossierSeal} />
        <p className={styles.waiting}>{atlasCopy.instructions}</p>
      </aside>
    );
  }
  const word = atlasCopy.dangerScale[place.danger - 1];
  return (
    <aside key={place.id} className={styles.dossier} aria-labelledby="dossier-title">
      <p className={styles.dossierFile}>
        <span>{place.kind}</span>
        <span>
          {gridRef(place)} / {String(place.x).padStart(3, "0")}.{String(place.y).padStart(3, "0")}
        </span>
      </p>
      <h2 id="dossier-title" ref={headingRef} tabIndex={-1} className={styles.dossierTitle}>
        {place.name}
      </h2>
      <p className={styles.epithet}>{place.epithet}</p>
      <div className={styles.danger}>
        <DangerScale danger={place.danger} />
        <p className={styles.dangerText}>
          <span>{atlasCopy.dangerLabel}</span>
          <span className={styles.dangerFigure}>{place.danger} / 5</span>
          <strong>{word}</strong>
        </p>
      </div>
      <p className={styles.dossierBody}>{place.dossier}</p>
      <button type="button" className={styles.close} onClick={onClose}>
        {atlasCopy.closeLabel}
      </button>
    </aside>
  );
}
