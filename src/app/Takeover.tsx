import { useCallback, useRef, useState } from "react";
import { cue } from "../audio";
import { Dialog } from "../components/Dialog";
import { takeover } from "../content/eye";
import { useSiteStore } from "../state/context";
import styles from "./Takeover.module.css";

function releaseMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--dur-takeover");
  return Number.parseFloat(raw) || 0;
}

/** One slow fade, one hold, one release. Only this component may reset attention. */
export function Takeover({ onAfterword }: { onAfterword(text: string): void }): React.JSX.Element {
  const store = useSiteStore();
  const button = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const left = useRef(false);

  const dismiss = useCallback(() => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    cue("found");
    window.setTimeout(() => {
      store.resetAttention();
      onAfterword(takeover.afterword);
    }, releaseMs());
  }, [store, onAfterword]);

  return (
    <Dialog
      role="alertdialog"
      labelledBy="takeover-title"
      describedBy="takeover-lines"
      className={styles.takeover}
      initialFocus={button}
      onDismiss={dismiss}
    >
      <div className={styles.veil} data-leaving={leaving || undefined}>
        <div className={styles.slit} aria-hidden="true" />
        <h1 id="takeover-title" className={styles.title}>
          {takeover.title}
        </h1>
        <div id="takeover-lines" className={styles.lines}>
          {takeover.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button ref={button} type="button" className={styles.dismiss} onClick={dismiss}>
          {takeover.dismissLabel}
        </button>
      </div>
    </Dialog>
  );
}
