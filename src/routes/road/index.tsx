import { DecreeHead } from "../../components/DecreeHead";
import { useReducedMotion } from "../../components/useReducedMotion";
import { instructions, roadCopy } from "../../content/road";
import { RoadGame } from "./RoadGame";
import styles from "./road.module.css";
import { controlsHeading, extraInstructions, fieldDescription, fieldHeading } from "./strings";

export default function Road(): React.JSX.Element {
  const reduced = useReducedMotion();
  return (
    <div className={styles.page}>
      <DecreeHead file="Office of the Watch" title={roadCopy.title}>
        <p>{roadCopy.subtitle}</p>
      </DecreeHead>
      <RoadGame reducedMotion={reduced} />
      <section className={styles.notes}>
        <div>
          <h2>{controlsHeading}</h2>
          <dl>
            {[...instructions, ...extraInstructions].map((item) => (
              <div key={item.action}>
                <dt>
                  {item.action}
                  <span>{item.keys}</span>
                </dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.touchHint}>{roadCopy.touchHint}</p>
        </div>
        <div id="road-description">
          <h2>{fieldHeading}</h2>
          {fieldDescription.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
