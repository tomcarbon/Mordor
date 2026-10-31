import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Dialog } from "../components/Dialog";
import { palette } from "../content/site";
import { useSiteStore } from "../state/context";
import { toggleAudio } from "./AudioToggle";
import { filterEntries } from "./palette-entries";
import type { PaletteEntry } from "./palette-entries";
import { flipRing } from "./RingToggle";
import styles from "./Palette.module.css";

// Not in content/site.ts, which is another role's file today: for the copywriter to absorb.
const CLOSE_LABEL = "Look away";

export interface PaletteProps {
  onClose(): void;
  onRingMessage(text: string): void;
}

export function Palette({ onClose, onRingMessage }: PaletteProps): React.JSX.Element {
  const store = useSiteStore();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => filterEntries(query), [query]);
  const go = results.filter((entry) => entry.action.kind === "go");
  const acts = results.filter((entry) => entry.action.kind !== "go");
  const ordered = [...go, ...acts];
  const activeEntry = ordered[active];

  function run(entry: PaletteEntry): void {
    const { action } = entry;
    if (action.kind === "go") {
      void navigate(action.path);
    } else if (action.kind === "ring") {
      flipRing(store, onRingMessage);
    } else {
      toggleAudio(store);
    }
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const count = ordered.length;
    if (event.key === "ArrowDown" && count) {
      event.preventDefault();
      setActive((active + 1) % count);
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      setActive((active - 1 + count) % count);
    } else if (event.key === "Home" && count) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && count) {
      event.preventDefault();
      setActive(count - 1);
    } else if (event.key === "Enter" && activeEntry) {
      event.preventDefault();
      run(activeEntry);
    }
  }

  function option(entry: PaletteEntry): React.JSX.Element {
    const index = ordered.indexOf(entry);
    return (
      <li
        key={entry.command.id}
        id={`palette-${entry.command.id}`}
        role="option"
        aria-selected={index === active}
        className={styles.option}
        onPointerMove={() => setActive(index)}
        onClick={() => run(entry)}
      >
        <span className={styles.optionLabel}>{entry.command.label}</span>
        <span className={styles.optionHint}>{entry.command.hint}</span>
      </li>
    );
  }

  return (
    <Dialog label={palette.ariaLabel} className={styles.palette} initialFocus={input} onDismiss={onClose} dismissOnBackdrop>
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>{palette.title}</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            {CLOSE_LABEL}
          </button>
        </div>
        <input
          ref={input}
          className={styles.input}
          role="combobox"
          aria-label={palette.placeholder}
          aria-expanded={ordered.length > 0}
          aria-controls="palette-list"
          aria-autocomplete="list"
          aria-activedescendant={activeEntry ? `palette-${activeEntry.command.id}` : undefined}
          placeholder={palette.placeholder}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div id="palette-list" role="listbox" aria-label={palette.title} className={styles.list}>
          {go.length ? (
            <ul role="group" aria-label={palette.groupGo}>
              <li role="presentation" className={styles.group}>
                {palette.groupGo}
              </li>
              {go.map(option)}
            </ul>
          ) : null}
          {acts.length ? (
            <ul role="group" aria-label={palette.groupActions}>
              <li role="presentation" className={styles.group}>
                {palette.groupActions}
              </li>
              {acts.map(option)}
            </ul>
          ) : null}
        </div>
        <p className={styles.empty} role="status">
          {ordered.length ? "" : palette.emptyState}
        </p>
        <p className={styles.hints}>
          <span>{palette.selectHint}</span>
          <span>{palette.closeHint}</span>
        </p>
      </div>
    </Dialog>
  );
}
