import { disableAudio, enableAudio } from "../audio";
import { audioControl } from "../content/site";
import { useSiteState, useSiteStore } from "../state/context";
import type { SiteStore } from "../state/store";
import styles from "./Controls.module.css";

/** Must run inside the user's click or keypress: the AudioContext is created here. */
export function toggleAudio(store: SiteStore): void {
  const on = !store.getSnapshot().audio;
  if (on) enableAudio();
  else disableAudio();
  store.setAudio(on);
}

export function AudioToggle(): React.JSX.Element {
  const store = useSiteStore();
  const audio = useSiteState((s) => s.audio);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={audio}
      title={audio ? audioControl.onCaption : audioControl.offCaption}
      onClick={() => toggleAudio(store)}
    >
      {audio ? audioControl.turnOffLabel : audioControl.turnOnLabel}
      <span className={styles.toggleState}>{audio ? audioControl.onCaption : audioControl.offCaption}</span>
    </button>
  );
}
