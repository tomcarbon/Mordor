import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { cue } from "../../audio";
import { gameOver, hud, instructions, roadCopy, stages, victory } from "../../content/road";
import { createKeyboard } from "../../game/input/keyboard";
import type { KeyboardInput } from "../../game/input/keyboard";
import { createStick } from "../../game/input/stick";
import type { Stick } from "../../game/input/stick";
import { createLoop } from "../../game/loop";
import type { Loop } from "../../game/loop";
import { createRenderer } from "../../game/render";
import type { Renderer } from "../../game/render";
import { createWorld, IDLE_INPUT, SIM_DT, step } from "../../game/sim";
import type { GameEvent, World } from "../../game/sim";
import { useSiteState, useSiteStore } from "../../state/context";
import { formatTime, readBest, recordRun } from "./best";
import type { BestRun } from "./best";
import { pickLossLine } from "./lossLine";
import styles from "./road.module.css";
import { extraHud, reducedMotionNotice } from "./strings";

type Screen = "intro" | "briefing" | "playing" | "paused" | "lost" | "won";

const MAX_CATCH_UP_STEPS = 5;
const HUD_EVERY_STEPS = 6;

const CUES: Partial<Record<GameEvent, Parameters<typeof cue>[0]>> = {
  spotted: "detected",
  "eye-locked": "alarm",
  lost: "found",
  pickup: "stamp",
  "stage-clear": "stamp",
};

function freshSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

function exposureBand(exposure: number): number {
  return exposure >= 0.7 ? 2 : exposure >= 0.35 ? 1 : 0;
}

function bestText(best: BestRun | null): string {
  if (!best) return extraHud.bestNone;
  if (best.won) return extraHud.bestWon(formatTime(best.seconds), best.burden);
  return extraHud.bestReached(stages[Math.max(0, best.stage - 1)]?.name ?? "");
}

function Meter({ label, name, tone }: { label: string; name: string; tone: "eye" | "burden" | "water" }): React.JSX.Element {
  return (
    <div className={styles.meter} data-tone={tone}>
      <span className={styles.meterLabel}>{label}</span>
      <span className={styles.meterValue} data-meter-value={name}>
        0
      </span>
      <span className={styles.meterTrack} aria-hidden="true">
        <span className={styles.meterFill} data-meter-fill={name} />
      </span>
    </div>
  );
}

export function RoadGame({ reducedMotion }: { reducedMotion: boolean }): React.JSX.Element {
  const store = useSiteStore();
  const ring = useSiteState((s) => s.ring);
  const [params] = useSearchParams();
  const pinned = params.get("seed");
  const pinnedSeed = pinned !== null && /^\d+$/.test(pinned) ? Number(pinned) >>> 0 : null;

  const [screen, setScreen] = useState<Screen>("intro");
  const [stageIndex, setStageIndex] = useState(0);
  const [lossLine, setLossLine] = useState("");
  const [best, setBest] = useState<BestRun | null>(() => readBest());
  const [canDraw, setCanDraw] = useState(true);
  const [announcement, setAnnouncement] = useState("");

  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stickBase = useRef<HTMLDivElement>(null);
  const stickKnob = useRef<HTMLDivElement>(null);
  const hudBox = useRef<HTMLDivElement>(null);

  const [firstWorld] = useState(() => createWorld(pinnedSeed ?? freshSeed()));
  const world = useRef<World>(firstWorld);
  const previous = useRef<World | null>(null);
  const renderer = useRef<Renderer | null>(null);
  const loop = useRef<Loop | null>(null);
  const keyboard = useRef<KeyboardInput | null>(null);
  const stick = useRef<Stick | null>(null);
  const screenRef = useRef<Screen>("intro");
  const band = useRef(0);
  const panel = useRef<HTMLButtonElement>(null);
  const focusPanel = useRef(false);

  const show = useCallback((next: Screen, takeFocus: boolean) => {
    screenRef.current = next;
    focusPanel.current = takeFocus;
    store.setRingLocked(next === "paused");
    // An attribute, not inline overflow: Dialog saves and restores that, and they would fight.
    const html = document.documentElement;
    if (!html.hasAttribute("data-road-playing")) {
      html.style.setProperty("--road-gutter", `${window.innerWidth - html.clientWidth}px`);
    }
    html.toggleAttribute("data-road-playing", next === "playing");
    setScreen(next);
  }, [store]);

  const paintHud = useCallback(() => {
    const box = hudBox.current;
    const root = field.current;
    if (!box || !root) return;
    const state = world.current;
    const meters: Array<[string, number]> = [
      ["exposure", state.exposure],
      ["burden", state.burden],
      ["water", state.water],
    ];
    for (const [name, value] of meters) {
      const percent = Math.round(value * 100);
      const label = box.querySelector<HTMLElement>(`[data-meter-value="${name}"]`);
      const fill = box.querySelector<HTMLElement>(`[data-meter-fill="${name}"]`);
      if (label) label.textContent = String(percent);
      if (fill) fill.style.transform = `scaleX(${value})`;
    }
    const gait = box.querySelector<HTMLElement>("[data-gait]");
    if (gait) gait.textContent = state.player.sneaking ? extraHud.sneaking : extraHud.walking;
    root.dataset.tick = String(state.tick);
    root.dataset.x = state.player.x.toFixed(2);
    root.dataset.y = state.player.y.toFixed(2);
    root.dataset.burden = state.burden.toFixed(3);
    const nextBand = exposureBand(state.exposure);
    if (nextBand !== band.current) {
      band.current = nextBand;
      if (nextBand > 0) setAnnouncement(`${hud.exposureLabel} ${Math.round(state.exposure * 100)}`);
    }
  }, []);

  const paint = useCallback(
    (alpha = 1, elapsed = 0) => {
      renderer.current?.draw(previous.current, world.current, alpha, elapsed);
    },
    [],
  );

  const finish = useCallback(
    (state: World) => {
      const stored = recordRun({
        won: state.phase === "won",
        stage: state.stageIndex + 1,
        seconds: state.stats.ticks * SIM_DT,
        burden: Math.round(state.burden * 100),
      });
      setBest(stored);
      if (state.phase === "lost" && state.cause) setLossLine(pickLossLine(state.cause));
    },
    [],
  );

  /** Reacts to one step's events. Returns false when play has stopped. */
  const handleStep = useCallback(
    (state: World): boolean => {
      for (const event of state.events) {
        const name = CUES[event];
        if (name) cue(name);
      }
      if (state.phase === "playing") return true;
      store.setRing(false);
      if (state.phase === "briefing") {
        setStageIndex(state.stageIndex);
        setAnnouncement(stages[state.stageIndex]?.name ?? "");
        show("briefing", true);
      } else {
        finish(state);
        setAnnouncement(state.phase === "won" ? victory.title : gameOver.title);
        show(state.phase, true);
      }
      paintHud();
      return false;
    },
    [finish, paintHud, show, store],
  );

  const pause = useCallback(
    (takeFocus: boolean) => {
      if (screenRef.current !== "playing") return;
      loop.current?.stop();
      keyboard.current?.clear();
      stick.current?.clear();
      setAnnouncement(extraHud.pausedTitle);
      show("paused", takeFocus);
    },
    [show],
  );

  const enterField = useCallback(() => {
    const root = field.current;
    if (!root) return;
    // By hand: the top strip is fixed, and scrollIntoView leaves the HUD beneath it.
    const clear = parseFloat(getComputedStyle(root).scrollMarginBlockStart) || 0;
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - clear });
  }, []);

  const resume = useCallback(() => {
    if (screenRef.current !== "paused") return;
    show("playing", false);
    enterField();
    canvas.current?.focus({ preventScroll: true });
    loop.current?.start();
  }, [enterField, show]);

  const toggleRing = useCallback(() => {
    if (screenRef.current !== "playing") return;
    store.setRing(!store.getSnapshot().ring);
  }, [store]);

  const proceed = useCallback(() => {
    world.current = step(world.current, { ...IDLE_INPUT, confirm: true });
    previous.current = null;
    show("playing", false);
    enterField();
    canvas.current?.focus({ preventScroll: true });
    loop.current?.start();
  }, [enterField, show]);

  const newRun = useCallback(() => {
    loop.current?.stop();
    keyboard.current?.clear();
    stick.current?.clear();
    store.setRing(false);
    world.current = createWorld(pinnedSeed ?? freshSeed());
    previous.current = null;
    band.current = 0;
    setStageIndex(0);
    show("briefing", true);
    enterField();
    paintHud();
    paint();
  }, [enterField, paint, paintHud, pinnedSeed, show, store]);

  // Mount once: the renderer, input and loop live for as long as the route does.
  useEffect(() => {
    const surface = canvas.current;
    const root = field.current;
    if (!surface || !root) return undefined;

    const draw = createRenderer(surface, root);
    renderer.current = draw;
    setCanDraw(draw !== null);
    draw?.resize();

    keyboard.current = createKeyboard(surface, {
      active: () => screenRef.current === "playing",
      onRing: toggleRing,
      onPause: () => (screenRef.current === "paused" ? resume() : pause(true)),
    });
    const base = stickBase.current;
    const knob = stickKnob.current;
    stick.current = base && knob ? createStick(base, knob) : null;

    let steps = 0;
    loop.current = createLoop({
      dt: SIM_DT,
      maxSteps: MAX_CATCH_UP_STEPS,
      onStep() {
        const keys = keyboard.current?.read() ?? IDLE_INPUT;
        const thumb = stick.current?.read();
        const useThumb = thumb && (thumb.moveX !== 0 || thumb.moveY !== 0);
        const held = useThumb ? thumb : keys;
        previous.current = world.current;
        world.current = step(world.current, { ...held, ring: store.getSnapshot().ring, confirm: false });
        steps += 1;
        if (steps % HUD_EVERY_STEPS === 0) paintHud();
        return handleStep(world.current);
      },
      onFrame(alpha, elapsed) {
        draw?.draw(previous.current, world.current, alpha, elapsed);
      },
    });

    const onBlur = (event: FocusEvent): void => {
      if (screenRef.current !== "playing") return;
      const next = event.relatedTarget;
      if (next instanceof Node && root.contains(next) && next !== surface) {
        surface.focus({ preventScroll: true });
        return;
      }
      pause(false);
    };
    const onVisibility = (): void => {
      if (document.hidden) pause(false);
    };
    // The visible height, not 100vh: a phone's address bar must not hide the controls.
    const onResize = (): void => {
      root.style.setProperty("--road-vh", `${window.innerHeight}px`);
      if (screenRef.current === "playing") enterField();
    };
    onResize();
    // The Escape that paused from the canvas arrives here too, and the canvas handles its own.
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || screenRef.current !== "paused" || event.target === surface) return;
      event.preventDefault();
      resume();
    };
    // A smooth wheel scroll already under way outlives both the hold and a scrollTo.
    const onScroll = (): void => {
      if (screenRef.current === "playing") enterField();
    };
    surface.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);

    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            draw?.resize();
            draw?.draw(previous.current, world.current, 1, 0);
          })
        : null;
    observer?.observe(surface);

    paintHud();
    draw?.draw(null, world.current, 1, 0);

    return () => {
      loop.current?.stop();
      observer?.disconnect();
      surface.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      store.setRingLocked(false);
      document.documentElement.removeAttribute("data-road-playing");
      keyboard.current?.destroy();
      stick.current?.destroy();
      draw?.destroy();
      renderer.current = null;
      loop.current = null;
    };
  }, [enterField, handleStep, paintHud, pause, resume, store, toggleRing]);

  useEffect(() => {
    renderer.current?.setReducedMotion(reducedMotion);
    if (screenRef.current !== "playing") paint();
  }, [paint, reducedMotion]);

  // Dialog-like panels take focus only when the player caused them, never on a blur to the Palette.
  useEffect(() => {
    if (focusPanel.current) panel.current?.focus({ preventScroll: true });
    focusPanel.current = false;
  }, [screen]);

  const stage = stages[stageIndex] ?? stages[0]!;
  const playing = screen === "playing";

  return (
    <section className={styles.game} aria-label={roadCopy.title}>
      <div ref={field} className={styles.field} data-eye data-state={screen}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          tabIndex={0}
          role="application"
          aria-label={extraHud.regionLabel}
          aria-describedby="road-description"
        />

        <div ref={hudBox} className={styles.hud} hidden={!canDraw}>
          <p className={styles.stage}>
            {hud.stageLabel} {extraHud.stageOf(stageIndex + 1, stages.length)}
            <span>{stage.name}</span>
          </p>
          <div className={styles.meters}>
            <Meter label={hud.exposureLabel} name="exposure" tone="eye" />
            <Meter label={extraHud.burden} name="burden" tone="burden" />
            <Meter label={extraHud.water} name="water" tone="water" />
          </div>
          <p className={styles.status}>
            <span data-testid="ring-state">{ring ? hud.ringOnLabel : hud.ringOffLabel}</span>
            <span data-gait>{extraHud.walking}</span>
          </p>
        </div>

        <p className="sr-only" role="status" aria-label={extraHud.statusLabel}>
          {announcement}
        </p>

        <div className={styles.touch} hidden={!playing}>
          <div ref={stickBase} className={styles.stick} aria-hidden="true">
            <div ref={stickKnob} className={styles.knob} />
          </div>
          <div className={styles.touchButtons}>
            <button type="button" className={styles.touchPause} onMouseDown={(e) => e.preventDefault()} onClick={() => pause(true)}>
              {roadCopy.pauseLabel}
            </button>
            <button
              type="button"
              className={styles.touchRing}
              aria-pressed={ring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleRing}
            >
              {ring ? hud.ringOnLabel : hud.ringOffLabel}
            </button>
          </div>
        </div>

        {!canDraw ? <p className={styles.noCanvas}>{extraHud.noCanvas}</p> : null}

        {screen === "intro" ? (
          <div className={styles.panel}>
            <h2>{roadCopy.title}</h2>
            {roadCopy.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {reducedMotion ? <p>{reducedMotionNotice}</p> : null}
            <ul className={styles.keys}>
              {instructions.map((item) => (
                <li key={item.action}>
                  <b>{item.keys}</b> {item.action}
                </li>
              ))}
            </ul>
            <p className={styles.best}>
              {extraHud.bestLabel}: {bestText(best)}
            </p>
            <button type="button" className={styles.action} onClick={newRun}>
              {roadCopy.startLabel}
            </button>
          </div>
        ) : null}

        {screen === "briefing" ? (
          <div className={styles.panel}>
            <p className={styles.kicker}>
              {hud.stageLabel} {extraHud.stageOf(stageIndex + 1, stages.length)}
            </p>
            <h2>{stage.name}</h2>
            <p>{stage.briefing}</p>
            <button ref={panel} type="button" className={styles.action} onClick={proceed}>
              {extraHud.proceed}
            </button>
          </div>
        ) : null}

        {screen === "paused" ? (
          <div className={styles.panel}>
            <h2>{extraHud.pausedTitle}</h2>
            <button ref={panel} type="button" className={styles.action} onClick={resume}>
              {roadCopy.resumeLabel}
            </button>
            <button type="button" className={styles.secondary} onClick={newRun}>
              {extraHud.restart}
            </button>
          </div>
        ) : null}

        {screen === "lost" ? (
          <div className={styles.panel} data-surface="decree">
            <h2>{gameOver.title}</h2>
            <p>{lossLine}</p>
            <p className={styles.best}>
              {extraHud.bestLabel}: {bestText(best)}
            </p>
            <button ref={panel} type="button" className={styles.action} onClick={newRun}>
              {gameOver.retryLabel}
            </button>
            <Link className={styles.exit} to="/">
              {gameOver.exitLabel}
            </Link>
          </div>
        ) : null}

        {screen === "won" ? (
          <div className={styles.panel} data-surface="decree">
            <h2>{victory.title}</h2>
            {victory.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <strong>{victory.verdict}</strong>
            </p>
            <p className={styles.best}>
              {extraHud.bestLabel}: {bestText(best)}
            </p>
            <button ref={panel} type="button" className={styles.action} onClick={newRun}>
              {victory.retryLabel}
            </button>
            <Link className={styles.exit} to="/">
              {victory.exitLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
