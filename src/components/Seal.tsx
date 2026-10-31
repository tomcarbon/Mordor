import { createElement } from "react";
import type { ReactElement } from "react";
import sigil from "../assets/sigil.svg?raw";
import styles from "./Seal.module.css";

/** Builds the asset as React elements, so the artwork stays in one file and no markup is injected. */
function toReact(node: Element): ReactElement {
  const props = Object.fromEntries(
    Array.from(node.attributes, ({ name, value }) => [name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), value]),
  );
  return createElement(node.localName, props, ...Array.from(node.children, toReact));
}

const artwork = toReact(new DOMParser().parseFromString(sigil, "image/svg+xml").documentElement);

export interface SealProps {
  /** Rendered size in px; 48 is the brand minimum. */
  size?: number;
  /** Decorative seals have no alt text. */
  decorative?: boolean;
  className?: string;
}

export function Seal({ size = 96, decorative = false, className }: SealProps): React.JSX.Element {
  const label = decorative ? {} : { role: "img", "aria-label": "Seal of the Black Land" };
  return (
    <span
      {...label}
      aria-hidden={decorative || undefined}
      className={[styles.seal, className].filter(Boolean).join(" ")}
      style={{ inlineSize: size, blockSize: size }}
    >
      {artwork}
    </span>
  );
}
