import styles from "./threshold.module.css";

const LID = "M-690-40C-400-330 400-330 690-40 400 250-400 250-690-40Z";

// Deterministic fibres, so the still Eye is the same on every visit.
const FIBRES = Array.from({ length: 150 }, (_, i) => {
  const angle = ((i + 0.5) / 150) * Math.PI * 2;
  const wobble = ((i * 37) % 13) / 13;
  const inner = 30 + wobble * 26;
  const outer = 128 + ((i * 53) % 17) * 5.5;
  return {
    d: `M${Math.cos(angle) * inner} ${Math.sin(angle) * inner}L${Math.cos(angle) * outer} ${Math.sin(angle) * outer}`,
    hot: i % 3 === 0,
    width: 1.4 + ((i * 17) % 5) * 0.7,
  };
});

// One side of the crust; the other is its mirror.
const CRACKS = [
  "M210-268 262-340 250-402 304-470 M262-340 348-362 420-340 492-392",
  "M420-226 496-280 590-262 650-310 744-300 M590-262 612-196 690-178 800-204",
  "M640-120 716-104 772-46 800-52",
  "M640 52 704 44 760 96 800 88 M704 44 720-20",
  "M430 150 500 224 480 300 540 360 M500 224 596 230 660 300 760 310",
  "M190 208 226 290 196 350",
];

/** The designed still Eye: without WebGL, and for reduced motion. */
export function EyeStatic(): React.JSX.Element {
  return (
    <svg
      className={styles.eye}
      viewBox="-800 -500 1600 1000"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="eye-iris">
          <stop offset="0.1" style={{ stopColor: "var(--heat-200)" }} />
          <stop offset="0.42" style={{ stopColor: "var(--eye)" }} />
          <stop offset="0.8" style={{ stopColor: "var(--ember-500)" }} />
          <stop offset="1" style={{ stopColor: "var(--wax-700)" }} />
        </radialGradient>
        <radialGradient id="eye-sclera" gradientUnits="userSpaceOnUse" cx="0" cy="-40" r="690">
          <stop offset="0.3" style={{ stopColor: "var(--wax-600)" }} />
          <stop offset="0.72" style={{ stopColor: "var(--wax-700)" }} />
          <stop offset="1" style={{ stopColor: "var(--iron-950)" }} />
        </radialGradient>
        <filter id="eye-rough" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="12" />
        </filter>
        <clipPath id="eye-almond">
          <path d={LID} />
        </clipPath>
      </defs>

      <rect x="-800" y="-500" width="1600" height="1000" style={{ fill: "var(--c-bg)" }} />

      <g fill="none" strokeWidth="3" style={{ stroke: "var(--c-seal)" }} filter="url(#eye-rough)">
        {CRACKS.map((d) => (
          <g key={d}>
            <path d={d} />
            <path d={d} transform="scale(-1 1)" />
          </g>
        ))}
      </g>

      <path d={LID} fill="url(#eye-sclera)" filter="url(#eye-rough)" />
      <g clipPath="url(#eye-almond)">
        <g transform="translate(0 -40)">
          <circle r="238" fill="url(#eye-iris)" />
          <g fill="none">
            {FIBRES.map((f) => (
              <path
                key={f.d}
                d={f.d}
                strokeWidth={f.width}
                style={{ stroke: f.hot ? "var(--heat-200)" : "var(--wax-700)" }}
                opacity={f.hot ? 0.75 : 0.6}
              />
            ))}
          </g>
          <circle r="244" fill="none" strokeWidth="18" style={{ stroke: "var(--iron-950)" }} />
          <path
            d="M0-214C36-96 36 96 0 214-36 96-36-96 0-214Z"
            strokeWidth="5"
            style={{ fill: "var(--iron-950)", stroke: "var(--heat-200)" }}
          />
        </g>
      </g>
      <path d={LID} fill="none" strokeWidth="9" filter="url(#eye-rough)" style={{ stroke: "var(--ember-500)" }} />
    </svg>
  );
}
