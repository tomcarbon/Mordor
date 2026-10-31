import { ringControl, ringMessages } from "../content/eye";
import { useSiteState, useSiteStore } from "../state/context";
import type { SiteStore } from "../state/store";
import styles from "./Controls.module.css";

export function pickRingMessage(on: boolean, random: () => number = Math.random): string {
  const lines = on ? ringMessages.on : ringMessages.off;
  return lines[Math.floor(random() * lines.length)]!;
}

/** The visitor's own toggle, from the strip or the Palette. A paused game holds the Ring as it is. */
export function flipRing(store: SiteStore, onMessage: (text: string) => void): void {
  const { ring, ringLocked } = store.getSnapshot();
  if (ringLocked) return;
  store.setRing(!ring);
  onMessage(pickRingMessage(!ring));
}

export function RingToggle({ onMessage }: { onMessage(text: string): void }): React.JSX.Element {
  const store = useSiteStore();
  const ring = useSiteState((s) => s.ring);
  const locked = useSiteState((s) => s.ringLocked);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={ring}
      aria-disabled={locked || undefined}
      title={ring ? ringControl.wornStatus : ringControl.unwornStatus}
      onClick={() => flipRing(store, onMessage)}
    >
      {ring ? ringControl.releaseLabel : ringControl.claimLabel}
      <span className={styles.toggleState}>
        {ring ? ringControl.wornStatus : ringControl.unwornStatus}
      </span>
    </button>
  );
}
