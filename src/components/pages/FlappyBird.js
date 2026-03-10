import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";

// ── Logical canvas size (landscape) ─────────────────────────────────────────
const W = 900, H = 500;

// ── Game constants ────────────────────────────────────────────────────────────
const GRAVITY         = 0.30;
const FLAP_VY         = -7.8;
const PIPE_GAP        = 210;
const PIPE_W          = 62;
const PIPE_SPEED_BASE = 2.6;
const PIPE_INTERVAL   = 130;
const BIRD_X          = 160;
const BIRD_R          = 11;

function getPipeSpeed(score) {
  return PIPE_SPEED_BASE + Math.min(score * 0.04, 2.2);
}

function makeStars() {
  return Array.from({ length: 140 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.6,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.15 + Math.random() * 0.55,
    z: 0.2 + Math.random() * 0.8,
  }));
}

export default function FlappyBird() {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const stateRef   = useRef("idle");
  const gameRef    = useRef(null);
  const rafRef     = useRef(null);

  const [displayScore, setDisplayScore] = useState(0);
  const [displayBest,  setDisplayBest]  = useState(0);
  const [screen,       setScreen]       = useState("idle");
  const [isNewBest,    setIsNewBest]    = useState(false);
  const [combo,        setCombo]        = useState(0);

  // ── Scale canvas to fill window ───────────────────────────────────────────
  useLayoutEffect(() => {
    function resize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / W, vh / H);
      if (wrapRef.current) {
        wrapRef.current.style.transform       = `scale(${scale})`;
        wrapRef.current.style.transformOrigin = "top left";
        wrapRef.current.style.left            = `${(vw - W * scale) / 2}px`;
        wrapRef.current.style.top             = `${(vh - H * scale) / 2}px`;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Game state factory ────────────────────────────────────────────────────
  function makeGameState() {
    return {
      frame: 0, score: 0,
      highscore: gameRef.current?.highscore ?? 0,
      combo: 0,
      bird: { x: BIRD_X, y: H / 2, vy: 0, angle: 0, trail: [], wingAngle: 0 },
      pipes: [], particles: [], scoreTexts: [],
      stars: makeStars(),
      pipeTimer: PIPE_INTERVAL - 50,
      shakeX: 0, shakeY: 0, shakeMag: 0,
    };
  }

  // ── Flap ──────────────────────────────────────────────────────────────────
  const flap = useCallback(() => {
    if (!gameRef.current) return;
    if (stateRef.current !== "playing") { startGame(); return; }
    const g = gameRef.current;
    g.bird.vy = FLAP_VY;
    spawnFlapParticles(g, g.bird.x, g.bird.y);
  }, []);

  function startGame() {
    const hs = gameRef.current?.highscore ?? 0;
    const g  = makeGameState();
    g.highscore = hs;
    g.bird.vy   = FLAP_VY;
    spawnFlapParticles(g, g.bird.x, g.bird.y);
    gameRef.current  = g;
    stateRef.current = "playing";
    setScreen("playing");
    setDisplayScore(0);
    setCombo(0);
    setIsNewBest(false);
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnFlapParticles(g, x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 1.5 + Math.random() * 3;
      g.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, r: 2 + Math.random() * 3, hue: 50 + Math.random() * 30, type: "flap" });
    }
  }

  function spawnScoreParticles(g, x, y, hue) {
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, r: 2 + Math.random() * 4, hue: hue + Math.random() * 40 - 20, type: "score" });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.particles.push({ x, y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
        life: 1, r: 4, hue: hue + 40, type: "ring" });
    }
  }

  function spawnDeathParticles(g, x, y) {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 10;
      g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 1, r: 2 + Math.random() * 5, hue: Math.random() > 0.5 ? 10 : 50, type: "death" });
    }
  }

  // ── Collision ─────────────────────────────────────────────────────────────
  function checkCollision(g) {
    const { x, y } = g.bird;
    if (y + BIRD_R >= H - 2 || y - BIRD_R <= 0) return true;
    for (const p of g.pipes) {
      const inX = x + BIRD_R > p.x + 5 && x - BIRD_R < p.x + PIPE_W - 5;
      if (inX && (y - BIRD_R < p.gapY - 4 || y + BIRD_R > p.gapY + PIPE_GAP + 4)) return true;
    }
    return false;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function update(g) {
    g.frame++;
    const bird = g.bird;

    bird.vy += GRAVITY;
    bird.vy  = Math.min(bird.vy, 11);
    bird.y  += bird.vy;
    bird.angle     = Math.max(-0.5, Math.min(Math.PI / 2.2, bird.vy * 0.07));
    bird.wingAngle = Math.sin(g.frame * 0.25) * 0.5;

    bird.trail.push({ x: bird.x, y: bird.y });
    if (bird.trail.length > 14) bird.trail.shift();

    g.pipeTimer++;
    if (g.pipeTimer >= PIPE_INTERVAL) {
      const minY = 70, maxY = H - 70 - PIPE_GAP;
      g.pipes.push({ x: W + 10, gapY: minY + Math.random() * (maxY - minY),
        scored: false, hue: Math.random() * 60 + 160 });
      g.pipeTimer = 0;
    }
    const speed = getPipeSpeed(g.score);
    g.pipes.forEach(p => (p.x -= speed));
    g.pipes = g.pipes.filter(p => p.x + PIPE_W > -10);

    let changed = false;
    g.pipes.forEach(p => {
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true; g.score++; g.combo++;
        g.shakeMag = g.combo >= 5 ? 5 : 2.5;
        const bonus = g.combo >= 5 ? ` ×${g.combo}` : "";
        g.scoreTexts.push({ x: p.x + PIPE_W / 2, y: p.gapY + PIPE_GAP / 2,
          vy: -2, life: 1, text: `+1${bonus}`, color: g.combo >= 5 ? "#ffff00" : "#00ffff" });
        spawnScoreParticles(g, p.x + PIPE_W / 2, p.gapY + PIPE_GAP / 2, p.hue);
        changed = true;
      }
    });
    if (changed) { setDisplayScore(g.score); setCombo(g.combo); }

    g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.97; p.life -= 0.022; });
    g.particles  = g.particles.filter(p => p.life > 0);
    g.scoreTexts.forEach(t => { t.y += t.vy; t.life -= 0.025; });
    g.scoreTexts = g.scoreTexts.filter(t => t.life > 0);

    if (g.shakeMag > 0) {
      g.shakeX = (Math.random() - 0.5) * g.shakeMag * 2;
      g.shakeY = (Math.random() - 0.5) * g.shakeMag * 2;
      g.shakeMag *= 0.75;
      if (g.shakeMag < 0.3) { g.shakeMag = 0; g.shakeX = 0; g.shakeY = 0; }
    }

    if (checkCollision(g)) {
      if (g.score > g.highscore) { g.highscore = g.score; setIsNewBest(true); }
      spawnDeathParticles(g, bird.x, bird.y);
      g.shakeMag = 12;
      stateRef.current = "dead";
      setDisplayBest(g.highscore);
      setScreen("dead");
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, g) {
    ctx.save();
    ctx.translate(g.shakeX, g.shakeY);
    drawBg(ctx, g);
    g.pipes.forEach(p => drawPipe(ctx, p));
    drawGround(ctx);
    drawParticles(ctx, g.particles);
    drawBird(ctx, g.bird, g.frame);
    drawScoreTexts(ctx, g.scoreTexts);
    ctx.restore();
  }

  function drawBg(ctx, g) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   "#02000c");
    grad.addColorStop(0.5, "#080018");
    grad.addColorStop(1,   "#000610");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const t = g.frame * 0.003;
    [
      { x: 120, y: 120, r: 160, hue: 280, a: 0.07 },
      { x: 600, y: 320, r: 200, hue: 200, a: 0.06 },
      { x: 360, y: 250, r: 130, hue: 320, a: 0.045 },
      { x: 820, y: 100, r: 120, hue: 260, a: 0.05  },
    ].forEach(b => {
      const ox = Math.sin(t + b.x) * 14, oy = Math.cos(t * 1.3 + b.y) * 10;
      const ng = ctx.createRadialGradient(b.x+ox, b.y+oy, 0, b.x+ox, b.y+oy, b.r);
      ng.addColorStop(0, `hsla(${b.hue},100%,60%,${b.a})`);
      ng.addColorStop(1, "transparent");
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(b.x+ox, b.y+oy, b.r, 0, Math.PI*2); ctx.fill();
    });

    g.stars.forEach(s => {
      s.twinkle += 0.04;
      const alpha = 0.2 + 0.8 * Math.abs(Math.sin(s.twinkle)) * s.z;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI*2); ctx.fill();
      if (stateRef.current === "playing") {
        s.x -= s.speed * s.z;
        if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
      }
    });

    ctx.fillStyle = "rgba(0,0,0,0.035)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  }

  function drawPipe(ctx, pipe) {
    const { hue, x, gapY } = pipe;
    const botY = gapY + PIPE_GAP;
    ctx.shadowColor = `hsl(${hue},100%,60%)`;
    ctx.shadowBlur  = 20;

    const mkGrad = () => {
      const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
      g.addColorStop(0,    `hsl(${hue},80%,20%)`);
      g.addColorStop(0.35, `hsl(${hue},90%,42%)`);
      g.addColorStop(1,    `hsl(${hue},70%,16%)`);
      return g;
    };

    ctx.fillStyle = mkGrad();
    ctx.fillRect(x, 0, PIPE_W, gapY);
    ctx.fillStyle = `hsl(${hue},100%,56%)`;
    ctx.fillRect(x - 6, gapY - 24, PIPE_W + 12, 24);

    ctx.fillStyle = mkGrad();
    ctx.fillRect(x, botY, PIPE_W, H - botY);
    ctx.fillStyle = `hsl(${hue},100%,56%)`;
    ctx.fillRect(x - 6, botY, PIPE_W + 12, 24);

    ctx.fillStyle = `hsla(${hue},100%,92%,0.15)`;
    ctx.fillRect(x + 5, 0, 5, gapY);
    ctx.fillRect(x + 5, botY, 5, H - botY);

    ctx.shadowBlur = 0;
  }

  function drawBird(ctx, bird, frame) {
    const { x, y, angle, trail, wingAngle } = bird;

    trail.forEach((t, i) => {
      const a = (i / trail.length) * 0.32;
      const r = 9  * (i / trail.length);
      ctx.fillStyle = `hsla(280,100%,70%,${a})`;
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI*2); ctx.fill();
    });

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    aura.addColorStop(0,   "rgba(255,255,100,0.45)");
    aura.addColorStop(0.5, "rgba(255,80,255,0.18)");
    aura.addColorStop(1,   "transparent");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();

    ctx.shadowColor = "#ffe000"; ctx.shadowBlur = 22;
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 17);
    bodyGrad.addColorStop(0,   "#fff176");
    bodyGrad.addColorStop(0.5, "#ffe000");
    bodyGrad.addColorStop(1,   "#e6a800");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI*2); ctx.fill();

    const belly = ctx.createRadialGradient(2, 1, 0, 2, 2, 10);
    belly.addColorStop(0, "rgba(255,255,220,0.55)"); belly.addColorStop(1, "transparent");
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(3, 2, 8, 6, 0.15, 0, Math.PI*2); ctx.fill();

    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = "#ffaa00"; ctx.shadowColor = "#ff8800"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(-5, 4, 9, 5, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.shadowBlur = 0;
    const eyeG = ctx.createRadialGradient(5, -4.5, 0.5, 7, -3, 5);
    eyeG.addColorStop(0, "#444"); eyeG.addColorStop(1, "#111");
    ctx.fillStyle = eyeG;
    ctx.beginPath(); ctx.arc(7, -3, 4.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath(); ctx.arc(8.2, -4.2, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#00ffff"; ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(7.5, -3.5, 1.1, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#cc5500";
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(20, 1.5); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff8800"; ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(20, 1.5); ctx.lineTo(13, 1); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawParticles(ctx, particles) {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.shadowColor = `hsl(${p.hue},100%,60%)`; ctx.shadowBlur = 8;
      if (p.type === "ring") {
        ctx.strokeStyle = `hsl(${p.hue},100%,70%)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - p.life) * 20, 0, Math.PI*2); ctx.stroke();
      } else {
        const pg = ctx.createRadialGradient(
          p.x - p.r * 0.3 * p.life, p.y - p.r * 0.3 * p.life, 0, p.x, p.y, p.r * p.life);
        pg.addColorStop(0,   `hsl(${p.hue},100%,90%)`);
        pg.addColorStop(0.5, `hsl(${p.hue},100%,60%)`);
        pg.addColorStop(1,   `hsl(${p.hue},80%,30%)`);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  function drawScoreTexts(ctx, texts) {
    texts.forEach(t => {
      ctx.globalAlpha = t.life;
      ctx.font = "bold 20px 'Orbitron', monospace";
      ctx.fillStyle = t.color; ctx.shadowColor = t.color; ctx.shadowBlur = 12;
      ctx.textAlign = "center";
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textAlign = "left";
  }

  function drawGround(ctx) {
    ctx.fillStyle = "rgba(255,0,255,0.06)";
    ctx.fillRect(0, H - 6, W, 6);
    ctx.shadowColor = "#ff00ff"; ctx.shadowBlur = 16;
    ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    gameRef.current = makeGameState();

    function loop() {
      const g = gameRef.current;
      if (stateRef.current === "playing") {
        update(g);
      } else {
        g.frame++;
        g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.97; p.life -= 0.022; });
        g.particles = g.particles.filter(p => p.life > 0);
        g.stars.forEach(s => { s.twinkle += 0.04; });
        if (g.shakeMag > 0) {
          g.shakeX = (Math.random() - 0.5) * g.shakeMag * 2;
          g.shakeY = (Math.random() - 0.5) * g.shakeMag * 2;
          g.shakeMag *= 0.75;
          if (g.shakeMag < 0.3) { g.shakeMag = 0; g.shakeX = 0; g.shakeY = 0; }
        }
        if (stateRef.current === "idle") {
          g.bird.y = H / 2 + Math.sin(g.frame * 0.04) * 12;
          g.bird.wingAngle = Math.sin(g.frame * 0.2) * 0.4;
        }
      }
      draw(ctx, g);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flap]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />

      <div ref={wrapRef} style={styles.wrapper}>
        <canvas ref={canvasRef} width={W} height={H} style={styles.canvas} />

        {screen === "playing" && (
          <div style={styles.hud} onClick={flap}>
            <div style={styles.score}>{displayScore}</div>
            {combo >= 2 && <div style={styles.combo}>{combo}× COMBO</div>}
            <div style={styles.highscore}>BEST: {displayBest}</div>
          </div>
        )}

        {screen === "idle" && (
          <div style={styles.overlay} onClick={flap}>
            <h1 style={styles.title}>FLAPPY SURGE</h1>
            <div style={styles.tagline}>NEON VELOCITY</div>
            <div style={styles.tapHint}>CLICK · SPACE · ↑  TO LAUNCH</div>
          </div>
        )}

        {screen === "dead" && (
          <div style={styles.overlay} onClick={flap}>
            <div style={styles.crashed}>CRASHED</div>
            <div style={styles.deathScore}>{displayScore}</div>
            {isNewBest && <div style={styles.newBest}>✦ NEW BEST ✦</div>}
            <div style={styles.deathBest}>BEST: {displayBest}</div>
            <div style={{ ...styles.tapHint, marginTop: 24 }}>CLICK TO RETRY</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const font = "'Orbitron', monospace";

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    background: "#000",
    overflow: "hidden",
  },
  wrapper: {
    position: "absolute",
    width:  W,
    height: H,
    userSelect: "none",
  },
  canvas: {
    display: "block",
    width:  W,
    height: H,
    boxShadow: "0 0 80px #ff00ff66, 0 0 160px #00ffff33",
  },
  hud: {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    pointerEvents: "none",
  },
  score: {
    position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
    fontFamily: font, fontSize: 56, fontWeight: 900, color: "#fff",
    textShadow: "0 0 20px #ff00ff, 0 0 40px #ff00ff", letterSpacing: 4,
    pointerEvents: "none",
  },
  combo: {
    position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)",
    fontFamily: font, fontSize: 15, fontWeight: 700, color: "#ffff00",
    textShadow: "0 0 12px #ffff00", letterSpacing: 3, whiteSpace: "nowrap",
  },
  highscore: {
    position: "absolute", top: 18, right: 20,
    fontFamily: font, fontSize: 12, color: "#ffffff55", letterSpacing: 2,
  },
  overlay: {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", cursor: "pointer",
  },
  title: {
    fontFamily: font, fontSize: 58, fontWeight: 900, color: "#fff",
    textShadow: "0 0 30px #ff00ff, 0 0 70px #ff00ff88",
    letterSpacing: 8, textAlign: "center", marginBottom: 10,
  },
  tagline: {
    fontFamily: font, fontSize: 12, color: "#ff00ffaa",
    letterSpacing: 5, marginBottom: 36,
  },
  tapHint: {
    fontFamily: font, fontSize: 13, color: "#fff", letterSpacing: 3,
    border: "1px solid #ffffff33", padding: "10px 32px", borderRadius: 2,
  },
  crashed: {
    fontFamily: font, fontSize: 40, fontWeight: 900, color: "#ff3366",
    textShadow: "0 0 24px #ff3366", letterSpacing: 6, marginBottom: 8,
  },
  deathScore: {
    fontFamily: font, fontSize: 80, fontWeight: 900, color: "#fff",
    textShadow: "0 0 30px #00ffff, 0 0 60px #00ffff", letterSpacing: 4, marginBottom: 4,
  },
  newBest: {
    fontFamily: font, fontSize: 13, color: "#ffff00",
    textShadow: "0 0 12px #ffff00", letterSpacing: 5, marginBottom: 6,
  },
  deathBest: {
    fontFamily: font, fontSize: 13, color: "#ffffff55", letterSpacing: 3,
  },
};