import { useEffect, useMemo, useRef, useState } from "react";
import { DecreeHead } from "../../components/DecreeHead";
import { legionCategories, legions, legionsCopy } from "../../content/legions";
import type { LegionCategory, LegionDossier } from "../../content/legions";
import { useMediaQuery } from "../_shared/useMediaQuery";
import { fileNumber, filterLegions, toggleCompare } from "./filter";
import { Brand, ComparativeCard, ServiceCard, Trace } from "./Instruments";
import styles from "./legions.module.css";

// Control labels the content module does not yet carry. Flagged to WO-0001.2 in the deliverable.
const COMPARE = "Compare";
const COMPARE_TITLE = "Comparative return";
const COMPARE_CLEAR = "Close the return";
const COMPARE_PROMPT = "One file marked. Mark a second to compare.";

function Folder({ file, as: Heading = "h2" }: { file: LegionDossier; as?: "h2" | "h3" }): React.JSX.Element {
  return (
    <article className={styles.folder} key={file.id}>
      <p className={styles.tab}>
        <span>{fileNumber(legions, file.id)}</span>
        <span>{file.category}</span>
      </p>
      <div className={styles.folderHead}>
        <Brand id={file.id} className={styles.brand} />
        <div>
          <Heading className={styles.folderName}>{file.name}</Heading>
          <p className={styles.role}>{file.role}</p>
        </div>
      </div>
      <ServiceCard file={file} />
      <p className={styles.text}>{file.text}</p>
      <aside className={styles.note}>
        <h4>{legionsCopy.noteLabel}</h4>
        <p>{file.ministryNote}</p>
      </aside>
    </article>
  );
}

export default function Legions(): React.JSX.Element {
  const wide = useMediaQuery("(min-width: 960px)");
  const [category, setCategory] = useState<LegionCategory | null>(null);
  const [openId, setOpenId] = useState<string | null>(legions[0]!.id);
  const [marked, setMarked] = useState<string[]>([]);
  const returnHeading = useRef<HTMLHeadingElement>(null);
  const shouldFocusReturn = useRef(false);

  const visible = useMemo(() => filterLegions(legions, category), [category]);
  const open = visible.find((file) => file.id === openId) ?? (wide ? visible[0] : undefined);
  const compared = marked.map((id) => legions.find((file) => file.id === id)!);
  const [left, right] = compared;

  useEffect(() => {
    if (marked.length === 2 && shouldFocusReturn.current) {
      returnHeading.current?.focus({ preventScroll: true });
      returnHeading.current?.scrollIntoView({ block: "start" });
    }
    shouldFocusReturn.current = false;
  }, [marked]);

  function mark(id: string): void {
    shouldFocusReturn.current = !marked.includes(id);
    setMarked((current) => toggleCompare(current, id));
  }

  return (
    <div className={styles.page}>
      <DecreeHead file="Directorate of Forces" title={legionsCopy.title}>
        <p>{legionsCopy.intro}</p>
      </DecreeHead>

      <div className={styles.filters} role="group" aria-label={legionsCopy.filterLabel}>
        <span className={styles.filterLabel}>{legionsCopy.filterLabel}</span>
        {[null, ...legionCategories].map((option) => (
          <button
            key={option ?? "all"}
            type="button"
            aria-pressed={category === option}
            onClick={() => setCategory(option)}
          >
            {option ?? legionsCopy.filterAllLabel}
            <span className={styles.count}>{filterLegions(legions, option).length}</span>
          </button>
        ))}
      </div>

      {left && right ? (
        <section className={styles.compare} aria-labelledby="comparative-return">
          <div className={styles.compareHead}>
            <h2 id="comparative-return" ref={returnHeading} tabIndex={-1}>
              {COMPARE_TITLE}
            </h2>
            <button type="button" onClick={() => setMarked([])}>
              {COMPARE_CLEAR}
            </button>
          </div>
          <div className={styles.compareSides}>
            {[left, right].map((file, index) => (
              <div key={file.id} className={styles.compareSide} data-side={index ? "right" : "left"}>
                <Brand id={file.id} className={styles.compareBrand} />
                <p className={styles.compareFile}>
                  <span className={styles.compareKey} data-hollow={index === 1 || undefined} />
                  {fileNumber(legions, file.id)}
                </p>
                <h3>{file.name}</h3>
                <p className={styles.role}>{file.role}</p>
              </div>
            ))}
          </div>
          <ComparativeCard left={left} right={right} />
          <div className={styles.compareNotes}>
            {[left, right].map((file) => (
              <p key={file.id}>
                <span>{legionsCopy.noteLabel}</span>
                {file.ministryNote}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.archive}>
        <div className={styles.index}>
          {left && !right ? <p className={styles.prompt} role="status">{COMPARE_PROMPT}</p> : null}
          {visible.length === 0 ? <p className={styles.empty}>{legionsCopy.emptyState}</p> : null}
          <ol>
            {visible.map((file) => {
              const isOpen = file.id === open?.id;
              return (
                <li key={file.id} className={styles.row} data-open={isOpen || undefined}>
                  <div className={styles.rowLine}>
                    <button
                      type="button"
                      className={styles.rowOpen}
                      aria-expanded={wide ? undefined : isOpen}
                      aria-current={wide && isOpen ? "true" : undefined}
                      onClick={() => setOpenId(isOpen && !wide ? null : file.id)}
                    >
                      <span className={styles.rowFile}>{fileNumber(legions, file.id)}</span>
                      <span className={styles.rowName}>{file.name}</span>
                      <Trace ratings={file.ratings} />
                    </button>
                    <button
                      type="button"
                      className={styles.rowMark}
                      aria-pressed={marked.includes(file.id)}
                      aria-label={`${COMPARE} ${file.name}`}
                      onClick={() => mark(file.id)}
                    >
                      <i aria-hidden="true" />
                      {COMPARE}
                    </button>
                  </div>
                  {!wide && isOpen ? <Folder file={file} as="h3" /> : null}
                </li>
              );
            })}
          </ol>
        </div>
        {wide && open ? (
          <div className={styles.pane}>
            <Folder key={open.id} file={open} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
