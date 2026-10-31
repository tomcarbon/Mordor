import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]';

export interface DialogProps {
  /** Accessible name. Use `labelledBy` instead when a visible title exists. */
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  className?: string;
  /** Gets focus on open; otherwise the first focusable element does. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Escape, and anything else that asks to close. */
  onDismiss(): void;
  /** A press and release on the backdrop dismisses too. A drag out of the panel does not. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

// Dialogs can stack (a takeover over a dossier), so the page stays locked until the last one goes.
let openDialogs = 0;
let pageOverflow = "";

/** Modal: portals to body, makes the app inert, traps Tab, and restores focus on close. */
export function Dialog(props: DialogProps): React.JSX.Element {
  const { initialFocus, onDismiss, dismissOnBackdrop } = props;
  const panel = useRef<HTMLDivElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    if (openDialogs === 0) pageOverflow = document.documentElement.style.overflow;
    openDialogs += 1;
    if (root) root.inert = true;
    document.documentElement.style.overflow = "hidden";
    const target = initialFocus?.current ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (target ?? panel.current)?.focus();
    return () => {
      openDialogs -= 1;
      if (openDialogs === 0) {
        if (root) root.inert = false;
        document.documentElement.style.overflow = pageOverflow;
      }
      previous?.focus?.();
    };
  }, [initialFocus]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      onDismiss();
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      ref={panel}
      role={props.role ?? "dialog"}
      aria-modal="true"
      aria-label={props.label}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={props.className}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && pressedBackdrop.current && event.target === event.currentTarget) onDismiss();
      }}
    >
      {props.children}
    </div>,
    document.body,
  );
}
