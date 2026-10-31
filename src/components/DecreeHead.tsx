import type { ReactNode } from "react";
import { Seal } from "./Seal";
import styles from "./DecreeHead.module.css";

export interface DecreeHeadProps {
  /** The Stamp line above the title, e.g. a file number. */
  file: string;
  title: string;
  children?: ReactNode;
}

/** The opening of every route: file number, monument title, seal at right, slab rule. */
export function DecreeHead({ file, title, children }: DecreeHeadProps): React.JSX.Element {
  return (
    <header className={styles.head}>
      <p className={styles.file}>{file}</p>
      <h1 className={styles.title}>{title}</h1>
      <Seal size={112} decorative className={styles.seal} />
      {children ? <div className={styles.intro}>{children}</div> : null}
    </header>
  );
}
