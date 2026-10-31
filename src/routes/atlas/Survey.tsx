import { memo, useMemo } from "react";
import { buildSurvey } from "./terrain";
import { SHEET } from "./view";
import styles from "./atlas.module.css";

const GRID = Array.from({ length: 9 }, (_, i) => (i + 1) * 100);

/** The linework. Static and memoised: panning moves it, nothing redraws it. */
export const Survey = memo(function Survey(): React.JSX.Element {
  const lines = useMemo(buildSurvey, []);
  return (
    <svg className={styles.lines} viewBox={`0 0 ${SHEET} ${SHEET}`} aria-hidden="true" focusable="false">
      <g className={styles.grid}>
        {GRID.map((at) => (
          <path key={at} d={`M${at} 0V${SHEET}M0 ${at}H${SHEET}`} />
        ))}
      </g>
      <path className={styles.pits} d={lines.pits} />
      <path className={styles.river} d={lines.rivers} />
      <path className={styles.coast} d={lines.coast} />
      {lines.waterlines.map((d, index) => (
        <path key={d} className={styles.waterline} d={d} style={{ opacity: 0.5 - index * 0.1 }} />
      ))}
      {lines.contours.map((d) => (
        <path key={d} className={styles.contour} d={d} />
      ))}
      <path className={styles.road} d={lines.roads} />
      <path className={styles.exclusion} d={lines.exclusion} />
      <path className={styles.fire} d={lines.fire} />
      <path className={styles.mass} d={lines.cone} />
      <path className={styles.ridge} d={lines.cone} />
      <path className={styles.hatch} d={lines.coneHatching} />
      {lines.peaks.map((band) => (
        <g key={band.id}>
          <path className={styles.mass} d={band.masses} />
          <path className={styles.ridge} d={band.ridges} />
          <path className={styles.hatch} d={band.hatching} />
        </g>
      ))}
    </svg>
  );
});
