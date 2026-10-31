// Keyboard input. Listens on the focused canvas, so losing focus ends all held keys.

export interface HeldInput {
  moveX: number;
  moveY: number;
  sneak: boolean;
}

export interface KeyboardHandlers {
  /** False while the game is not in play: Escape still reaches onPause, nothing else acts. */
  active?(): boolean;
  onRing(): void;
  onPause(): void;
}

export interface KeyboardInput {
  read(): HeldInput;
  clear(): void;
  destroy(): void;
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const UP = new Set(["ArrowUp", "KeyW"]);
const DOWN = new Set(["ArrowDown", "KeyS"]);
const SNEAK = new Set(["ShiftLeft", "ShiftRight"]);
const HANDLED = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN, ...SNEAK, "Space", "Escape"]);

export function createKeyboard(target: HTMLElement, handlers: KeyboardHandlers): KeyboardInput {
  const held = new Set<string>();

  function down(event: KeyboardEvent): void {
    if (!HANDLED.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (event.code !== "Escape" && handlers.active?.() === false) return;
    if (event.code === "Space") {
      if (!event.repeat) handlers.onRing();
    } else if (event.code === "Escape") {
      if (!event.repeat) handlers.onPause();
    } else {
      held.add(event.code);
    }
  }

  function up(event: KeyboardEvent): void {
    held.delete(event.code);
  }

  function clear(): void {
    held.clear();
  }

  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  target.addEventListener("blur", clear);

  const any = (keys: Set<string>): boolean => [...keys].some((key) => held.has(key));

  return {
    read() {
      const moveX = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0);
      const moveY = (any(DOWN) ? 1 : 0) - (any(UP) ? 1 : 0);
      return { moveX, moveY, sneak: any(SNEAK) };
    },
    clear,
    destroy() {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", clear);
    },
  };
}
