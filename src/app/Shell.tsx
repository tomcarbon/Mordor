import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, matchRoutes, NavLink, useLocation } from "react-router";
import { setTension, setWraith } from "../audio";
import { Seal } from "../components/Seal";
import { meta, nav, palette, site } from "../content/site";
import type { MetaKey } from "../content/site";
import { useSiteState, useSiteStore } from "../state/context";
import { AttentionMeter } from "./AttentionMeter";
import { AudioToggle } from "./AudioToggle";
import { Footer } from "./Footer";
import { pickObservation } from "./meter";
import { Palette } from "./Palette";
import { RingToggle } from "./RingToggle";
import styles from "./Shell.module.css";
import { Takeover } from "./Takeover";

export const PASSIVE_RISE_PER_SECOND = 0.35;
export const ROUTE_VISIT_RISE = 2;
const OBSERVATION_EVERY_SECONDS = 48;
const SLIP_MS = 9000;

export interface Slip {
  key: number;
  text: string;
  /** Observations stay out of the live region; the meter panel keeps them readable. */
  announce: boolean;
}

const NAV_ROUTES = nav.map(({ path }) => ({ path }));

/** Asks the router's own matcher, so case, trailing slashes and escapes agree with what rendered. */
function metaKeyFor(pathname: string): MetaKey {
  const path = matchRoutes(NAV_ROUTES, pathname)?.[0]?.route.path;
  return nav.find((item) => item.path === path)?.id ?? "notFound";
}

export function Shell({ children }: { children: ReactNode }): React.JSX.Element {
  const store = useSiteStore();
  const ring = useSiteState((s) => s.ring);
  const found = useSiteState((s) => s.attention >= 100);
  const { pathname } = useLocation();
  const onRoad = metaKeyFor(pathname) === "road";
  const showTakeover = found && !onRoad;

  const main = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slip, setSlip] = useState<Slip | null>(null);
  const [observation, setObservation] = useState<{ id: string; text: string } | null>(null);

  const showSlip = useCallback((text: string, announce = true) => {
    setSlip((prev) => ({ key: (prev?.key ?? 0) + 1, text, announce }));
  }, []);

  useEffect(() => {
    if (!slip) return undefined;
    const timer = window.setTimeout(() => setSlip(null), SLIP_MS);
    return () => window.clearTimeout(timer);
  }, [slip]);

  useEffect(() => {
    const entry = meta[metaKeyFor(pathname)];
    document.title = entry.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", entry.description);
    setMenuOpen(false);
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    store.raiseAttention(ROUTE_VISIT_RISE);
  }, [pathname, store]);

  useEffect(() => {
    if (ring) document.documentElement.setAttribute("data-ring", "on");
    else document.documentElement.removeAttribute("data-ring");
    setWraith(ring);
  }, [ring]);

  useEffect(() => {
    const push = () => setTension(store.getSnapshot().attention / 100);
    push();
    return store.subscribe(push);
  }, [store]);

  useEffect(() => {
    if (onRoad) return undefined;
    let elapsed = 0;
    let lastId: string | null = null;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      store.raiseAttention(PASSIVE_RISE_PER_SECOND);
      elapsed += 1;
      if (elapsed % OBSERVATION_EVERY_SECONDS === 0) {
        const line = pickObservation(store.getSnapshot().ring, lastId);
        lastId = line.id;
        setObservation(line);
        showSlip(line.text, false);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onRoad, store, showSlip]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!showTakeover) setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showTakeover]);

  // Being found outranks the Stone: it must not come back when the takeover ends.
  useEffect(() => {
    if (showTakeover) setPaletteOpen(false);
  }, [showTakeover]);

  const hero = metaKeyFor(pathname) === "threshold";

  return (
    <div className={styles.shell} data-hero={hero || undefined}>
      <button type="button" className={styles.skip} onClick={() => main.current?.focus()}>
        {site.skipLink}
      </button>

      <div className={styles.strip} data-strip>
        <AttentionMeter observation={observation?.text ?? null} />
        <RingToggle onMessage={showSlip} />
        <AudioToggle />
      </div>

      {slip ? (
        <p key={slip.key} className={styles.slip} aria-hidden={!slip.announce || undefined}>
          {slip.text}
        </p>
      ) : null}
      <p className="sr-only" role="status">
        {slip?.announce ? slip.text : ""}
      </p>

      <header className={styles.header}>
        <Link to="/" className={styles.mark}>
          <Seal size={48} decorative />
          <span>
            <span className={styles.markTitle}>{site.title}</span>
            <span className={styles.markSub}>{site.subtitle}</span>
          </span>
        </Link>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {palette.groupGo}
        </button>
        <nav id="site-nav" className={styles.nav} data-open={menuOpen || undefined} aria-label={site.title}>
          <ul>
            {nav.map((item) => (
              <li key={item.id}>
                <NavLink to={item.path} end={item.path === "/"}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          className={styles.stone}
          aria-haspopup="dialog"
          aria-label={`${palette.title}. ${palette.openHint}`}
          title={palette.openHint}
          onClick={() => setPaletteOpen(true)}
        >
          {palette.title}
        </button>
      </header>

      <main ref={main} id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>

      <Footer />

      <div className="ring-edge" aria-hidden="true" />

      {paletteOpen && !showTakeover ? <Palette onClose={() => setPaletteOpen(false)} onRingMessage={showSlip} /> : null}
      {showTakeover ? <Takeover onAfterword={showSlip} /> : null}
    </div>
  );
}
