import { Component } from "react";
import type { ReactNode } from "react";
import { footer, site } from "../content/site";
import styles from "./ErrorBoundary.module.css";

interface State {
  failed: boolean;
}

/** Last resort. Uses neither store nor router, which may be what failed, and keeps the fan notice. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(): void {
    // The Shell that would have cleared this is gone.
    document.documentElement.removeAttribute("data-ring");
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const { heading, line, returnLabel } = site.errorFallback;
    return (
      <main className={styles.fallback}>
        <h1>{heading}</h1>
        <p>{line}</p>
        {/* A real navigation: only a fresh load clears the failure. */}
        <a href="./">{returnLabel}</a>
        <p className={styles.notice}>{footer.fanNotice}</p>
      </main>
    );
  }
}
