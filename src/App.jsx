import { useEffect, useMemo, useRef, useState } from "react";

const sigils = [
  { label: "Barad-dur", copy: "The fortress stack for your darkest deploys." },
  { label: "Orodruin", copy: "Molten pipelines and zero-forgiveness uptime." },
  { label: "Nazgul", copy: "Nine failovers, zero outages." },
  { label: "The Black Gate", copy: "APIs that open only when you say so." }
];

const steps = [
  {
    title: "Forge the Stack",
    detail: "Compose a monolith of services with ironclad constraints."
  },
  {
    title: "Bind the Interfaces",
    detail: "Unify dashboards, maps, and battle logs into one command hall."
  },
  {
    title: "Deploy the Shadow",
    detail: "Push to the edge with scorched-earth rollback strategies."
  }
];

const GAME_DURATION = 30;
const MOVE_INTERVAL_MS = 750;
const SPEED_MIN_MS = 260;
const SPEED_STEP = 35;
const COMBO_TIMEOUT_MS = 1200;
const MAX_COMBO = 6;
const TIERS = [
  { id: "ember", label: "Ember", minScore: 0, tone: 380 },
  { id: "inferno", label: "Inferno", minScore: 20, tone: 520 },
  { id: "doom", label: "Doom", minScore: 45, tone: 680 }
];
const HIGH_SCORES_KEY = "mordor-high-scores";
const MAX_HIGH_SCORES = 5;

export default function App() {
  const [forgeMode, setForgeMode] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(1);
  const [streak, setStreak] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [moveInterval, setMoveInterval] = useState(MOVE_INTERVAL_MS);
  const [highScores, setHighScores] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [shake, setShake] = useState(false);
  const [vibeOn, setVibeOn] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("Citadel");
  const audioRef = useRef(null);
  const comboTimerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("mode--forge", forgeMode);
    document.body.classList.toggle("mode--ember", !forgeMode);
  }, [forgeMode]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const progress = total > 0 ? doc.scrollTop / total : 0;
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = [
      { id: "citadel", label: "Citadel" },
      { id: "sigils", label: "Sigils" },
      { id: "rituals", label: "Rituals" },
      { id: "arena", label: "Arena" },
      { id: "summon", label: "Summon" }
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const found = sections.find((section) => section.id === entry.target.id);
            if (found) setActiveSection(found.label);
          }
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let animationId = 0;
    const embers = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.8 + Math.random() * 2.2,
      speed: 0.12 + Math.random() * 0.35,
      drift: -0.2 + Math.random() * 0.4,
      alpha: 0.08 + Math.random() * 0.25
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * window.devicePixelRatio);
      canvas.height = Math.floor(height * window.devicePixelRatio);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    let animate = true;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const glow =
        getComputedStyle(document.body).getPropertyValue("--ember-2") || "#ff6a2e";
      ctx.fillStyle = glow;
      embers.forEach((ember) => {
        ember.y -= ember.speed / 100;
        ember.x += ember.drift / 500;
        if (ember.y < -0.05) ember.y = 1.05;
        if (ember.x < -0.1) ember.x = 1.1;
        if (ember.x > 1.1) ember.x = -0.1;
        ctx.globalAlpha = ember.alpha;
        ctx.beginPath();
        ctx.arc(ember.x * width, ember.y * height, ember.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (animate) {
        animationId = requestAnimationFrame(render);
      }
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    resize();
    animate = !reducedMotion.matches;
    render();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(HIGH_SCORES_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setHighScores(parsed.slice(0, MAX_HIGH_SCORES));
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
  }, [highScores]);

  useEffect(() => {
    if (!gameActive) return;
    if (timeLeft <= 0) {
      setGameActive(false);
      setLastResult({ score, hits: score, misses, streak });
      if (score > 0) {
        setHighScores((prev) => {
          const updated = [{ score, date: new Date().toISOString() }, ...prev]
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_HIGH_SCORES);
          return updated;
        });
      }
      return;
    }
    const tick = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(tick);
  }, [gameActive, timeLeft, score, misses]);

  useEffect(() => {
    if (!gameActive) return;
    const move = () => {
      setTarget({
        x: 10 + Math.random() * 80,
        y: 12 + Math.random() * 70
      });
    };
    move();
    const interval = setInterval(move, moveInterval);
    return () => clearInterval(interval);
  }, [gameActive, moveInterval]);

  const accuracy = useMemo(() => {
    const total = score + misses;
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  }, [score, misses]);

  useEffect(() => {
    if (!gameActive) return;
    const next = Math.max(SPEED_MIN_MS, MOVE_INTERVAL_MS - score * SPEED_STEP);
    setMoveInterval(next);
  }, [gameActive, score]);

  const tier = useMemo(() => {
    const sorted = [...TIERS].sort((a, b) => b.minScore - a.minScore);
    return sorted.find((entry) => score >= entry.minScore) || TIERS[0];
  }, [score]);

  const startGame = () => {
    setScore(0);
    setMisses(0);
    setCombo(1);
    setStreak(0);
    setTimeLeft(GAME_DURATION);
    setMoveInterval(MOVE_INTERVAL_MS);
    setLastResult(null);
    setGameActive(true);
  };

  const resetComboTimer = () => {
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    comboTimerRef.current = setTimeout(() => {
      setCombo(1);
      setStreak(0);
    }, COMBO_TIMEOUT_MS);
  };

  const playHit = () => {
    if (!audioRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current = ctx;
    }
    const ctx = audioRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = tier.tone + combo * 18;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  };

  const triggerPulse = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 200);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 240);
  };

  const vibrate = (pattern) => {
    if (!vibeOn) return;
    if (navigator && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return (
    <div className="page">
      <canvas className="ember-field" ref={canvasRef} aria-hidden="true" />
      <a className="skip-link" href="#citadel">
        Skip to content
      </a>
      <aside className="command-hud">
        <div className="command-hud__label">Command HUD</div>
        <div className="command-hud__section">{activeSection}</div>
        <div className="command-hud__bar">
          <span style={{ width: `${Math.round(scrollProgress * 100)}%` }} />
        </div>
        <div className="command-hud__percent">
          {Math.round(scrollProgress * 100)}%
        </div>
      </aside>
      <header className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <nav className="nav">
          <span className="nav__brand">Mordor Lab</span>
          <div className="nav__links">
            <a href="#citadel">Citadel</a>
            <a href="#sigils">Sigils</a>
            <a href="#rituals">Rituals</a>
            <a href="#arena">Arena</a>
            <a href="#summon">Summon</a>
          </div>
          <div className="nav__actions">
            <button className="nav__cta">Swear Allegiance</button>
            <button
              className="btn btn--ghost btn--toggle"
              onClick={() => setForgeMode((prev) => !prev)}
            >
              {forgeMode ? "Forge Mode" : "Ember Mode"}
            </button>
          </div>
        </nav>

        <div className="hero__grid">
          <div className="hero__copy" data-reveal>
            <p className="eyebrow">Ash. Iron. Intent.</p>
            <h1>
              A React stronghold worthy of Mordor.
              <span>Built to command the storm.</span>
            </h1>
            <p className="lead">
              Shape your product like a dark tower: brutal focus, luminous power,
              and a skyline that dares rivals to march.
            </p>
            <div className="hero__actions">
              <button className="btn btn--primary">Enter the Citadel</button>
              <button className="btn btn--ghost">Tour the Forge</button>
            </div>
            <div className="hero__stats">
              <div>
                <span className="stat__value">9</span>
                <span className="stat__label">rings of uptime</span>
              </div>
              <div>
                <span className="stat__value">00:01</span>
                <span className="stat__label">failover delay</span>
              </div>
              <div>
                <span className="stat__value">7.2K</span>
                <span className="stat__label">shadow agents</span>
              </div>
            </div>
          </div>

          <div className="hero__panel" id="citadel" data-reveal>
            <div className="panel__header">
              <span>Citadel Telemetry</span>
              <span className="panel__status">LIVE</span>
            </div>
            <div className="panel__body">
              <div className="panel__rings">
                <div className="ring ring--outer" />
                <div className="ring ring--mid" />
                <div className="ring ring--inner" />
                <div className="ring__core">1</div>
              </div>
              <div className="panel__metrics">
                <div>
                  <p>Heat Index</p>
                  <h3>+984&#8457;</h3>
                </div>
                <div>
                  <p>Signal Strength</p>
                  <h3>99.97%</h3>
                </div>
                <div>
                  <p>Sentinel Scan</p>
                  <h3>Active</h3>
                </div>
              </div>
            </div>
            <div className="panel__footer">
              <div>
                <span>Threat Vector</span>
                <strong>Obsidian Delta</strong>
              </div>
              <button className="btn btn--ghost">Initiate Pulse</button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="sigils" id="sigils">
          <div className="section__header" data-reveal>
            <h2>Sigils of the Tower</h2>
            <p>
              Each sigil marks a capability forged for control, speed, and awe.
            </p>
          </div>
          <div className="sigils__grid" data-reveal>
            {sigils.map((sigil) => (
              <article className="sigil" key={sigil.label}>
                <h3>{sigil.label}</h3>
                <p>{sigil.copy}</p>
                <button className="btn btn--link">Engage</button>
              </article>
            ))}
          </div>
        </section>

        <section className="rituals" id="rituals">
          <div className="section__header" data-reveal>
            <h2>The Ritual Sequence</h2>
            <p>
              A three-step rite to awaken Mordor-grade product presence.
            </p>
          </div>
          <div className="rituals__steps" data-reveal>
            {steps.map((step, index) => (
              <div className="ritual" key={step.title}>
                <span className="ritual__index">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="arena" id="arena">
          <div className="section__header" data-reveal>
            <h2>The Arena: Shadow Rush</h2>
            <p>
              An action micro-game. Hunt the ember node before it vanishes.
            </p>
          </div>
          <div className="arena__grid">
            <div className="arena__panel" data-reveal>
              <div className="arena__hud">
                <div>
                  <span>Time</span>
                  <strong>{timeLeft}s</strong>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{score}</strong>
                </div>
                <div>
                  <span>Accuracy</span>
                  <strong>{accuracy}%</strong>
                </div>
                <div>
                  <span>Combo</span>
                  <strong>x{combo}</strong>
                </div>
                <div>
                  <span>Tier</span>
                  <strong>{tier.label}</strong>
                </div>
              </div>
              <div
                className={`arena__field tier--${tier.id} ${pulse ? "is-pulse" : ""} ${shake ? "is-shake" : ""}`}
                onClick={() => {
                  if (!gameActive) return;
                  setMisses((prev) => prev + 1);
                  setCombo(1);
                  setStreak(0);
                  triggerShake();
                  vibrate([80, 50, 60]);
                }}
                role="presentation"
              >
                <button
                  className={`arena__target ${gameActive ? "is-live" : ""}`}
                  style={{ left: `${target.x}%`, top: `${target.y}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!gameActive) return;
                    setScore((prev) => prev + combo);
                    setStreak((prev) => prev + 1);
                    setCombo((prev) => Math.min(MAX_COMBO, prev + 1));
                    resetComboTimer();
                    playHit();
                    triggerPulse();
                    vibrate(30);
                  }}
                  aria-label="Ember node target"
                  disabled={!gameActive}
                />
                {!gameActive && (
                  <div className="arena__overlay">
                    <p>Strike the ember node as it moves.</p>
                    <button className="btn btn--primary" onClick={startGame}>
                      Start Run
                    </button>
                  </div>
                )}
              </div>
              {lastResult && (
                <div className="arena__result">
                  <div className="arena__result-main">
                    <span>Last Run</span>
                    <strong>
                      {lastResult.score} hits · {lastResult.misses} misses ·{" "}
                      {accuracy}% · streak {lastResult.streak}
                    </strong>
                  </div>
                  <div className="arena__result-badge">
                    {lastResult.misses === 0 && lastResult.score > 0
                      ? "Perfect Run"
                      : "Run Logged"}
                  </div>
                </div>
              )}
            </div>
            <div className="arena__brief" data-reveal>
              <h3>Field Brief</h3>
              <p>
                This is a timed reflex test. Click the moving node to score.
                The arena stays relentless for the full run.
              </p>
              <ul className="arena__rules">
                <li>30 seconds on the clock.</li>
                <li>Precision beats chaos. Keep the combo alive.</li>
                <li>Keep your focus on the ember glow.</li>
              </ul>
              <label className="arena__toggle">
                <input
                  type="checkbox"
                  checked={vibeOn}
                  onChange={(event) => setVibeOn(event.target.checked)}
                />
                <span>Haptics</span>
              </label>
              <button className="btn btn--ghost">Share Your Score</button>
              <div className="arena__scores">
                <h4>High Scores</h4>
                {highScores.length === 0 ? (
                  <p>Be the first to etch your name.</p>
                ) : (
                  <ol>
                    {highScores.map((entry, index) => (
                      <li key={`${entry.date}-${index}`}>
                        <span>{entry.score}</span>
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="summon" id="summon">
          <div className="summon__card" data-reveal>
            <h2>Summon the Shadow Council</h2>
            <p>
              Enter your signal and receive the blueprint for a Mordor-caliber
              launch.
            </p>
            <form className="summon__form">
              <input
                type="email"
                name="email"
                placeholder="shadow@domain.com"
                autoComplete="email"
              />
              <button className="btn btn--primary" type="submit">
                Send the Raven
              </button>
            </form>
            <p className="summon__footnote">
              No spam. Only black iron updates.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer" data-reveal>
        <div>
          <span className="nav__brand">Mordor Lab</span>
          <p>Command the realm. Shape the skyline.</p>
        </div>
        <div className="footer__links">
          <a href="#citadel">Citadel</a>
          <a href="#sigils">Sigils</a>
          <a href="#rituals">Rituals</a>
        </div>
      </footer>
    </div>
  );
}
