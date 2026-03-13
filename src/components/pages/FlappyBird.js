import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import playerOne from "../../assets/jacob.jpeg";
import playerTwo from "../../assets/jacob2.jpeg"

// ── Canvas size (landscape) ──────────────────────────────────────────────────
const W = 900, H = 500;

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY         = 0.30;
const FLAP_VY         = -7.8;
const PIPE_GAP        = 210;
const PIPE_W          = 62;
const PIPE_SPEED_BASE = 2.6;
const PIPE_INTERVAL   = 130;
const BIRD_R          = 11;

// P1 = left side, P2 = right side (x positions)
const P1_X = 160;
const P2_X = 300;

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

function makeBird(x) {
  return { x, y: H / 2, vy: 0, angle: 0, trail: [], alive: true };
}

export default function FlappyBird() {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const stateRef  = useRef("idle"); // idle | playing | over
  const gameRef   = useRef(null);
  const rafRef    = useRef(null);
  const spriteRef = useRef(null);
  const sprite2Ref = useRef(null);

  // preload sprite
  useEffect(() => {
    const img = new Image();
    img.src = playerOne;
    img.onload = () => { spriteRef.current = img; };
    
    const img2 = new Image();
    img2.src = playerTwo;
    img2.onload = () => { sprite2Ref.current = img2; };
  }, []);

  const [screen,   setScreen]   = useState("idle");
  const [gameOver, setGameOver] = useState(null); // null | "p1" | "p2" | "tie"
  const [scores,   setScores]   = useState([0, 0]);

  // ── Scale to fill window ──────────────────────────────────────────────────
  useLayoutEffect(() => {
    function resize() {
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      if (wrapRef.current) {
        wrapRef.current.style.transform       = `scale(${scale})`;
        wrapRef.current.style.transformOrigin = "top left";
        wrapRef.current.style.left = `${(window.innerWidth  - W * scale) / 2}px`;
        wrapRef.current.style.top  = `${(window.innerHeight - H * scale) / 2}px`;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Game state ────────────────────────────────────────────────────────────
  function makeGameState() {
    return {
      frame: 0,
      birds: [makeBird(P1_X), makeBird(P2_X)],
      pipes: [],
      particles: [],
      scoreTexts: [],
      scores: [0, 0],
      stars: makeStars(),
      pipeTimer: PIPE_INTERVAL - 50,
      shakeX: 0, shakeY: 0, shakeMag: 0,
    };
  }

  // ── Flap helpers ──────────────────────────────────────────────────────────
  const flapBird = useCallback((idx) => {
    const g = gameRef.current;
    if (!g) return;
    if (stateRef.current === "idle" || stateRef.current === "over") {
      startGame(); return;
    }
    const bird = g.birds[idx];
    if (!bird.alive) return;
    bird.vy = FLAP_VY;
    spawnFlapParticles(g, bird.x, bird.y, idx === 0 ? 140 : 300);
  }, []);

  function startGame() {
    const g = makeGameState();
    gameRef.current  = g;
    stateRef.current = "playing";
    setScreen("playing");
    setGameOver(null);
    setScores([0, 0]);
    // give both birds an initial flap
    g.birds[0].vy = FLAP_VY;
    g.birds[1].vy = FLAP_VY;
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnFlapParticles(g, x, y, hue) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 1.5 + Math.random() * 3;
      g.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        life: 1, r: 2 + Math.random()*3, hue, type: "flap" });
    }
  }

  function spawnScoreParticles(g, x, y, hue) {
    for (let i = 0; i < 28; i++) {
      const a = Math.random()*Math.PI*2, sp = 2 + Math.random()*6;
      g.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        life: 1, r: 2 + Math.random()*4, hue: hue + Math.random()*40-20, type:"score" });
    }
    for (let i = 0; i < 10; i++) {
      const a = (i/10)*Math.PI*2;
      g.particles.push({ x, y, vx: Math.cos(a)*5, vy: Math.sin(a)*5,
        life: 1, r: 4, hue: hue+40, type:"ring" });
    }
  }

  function spawnDeathParticles(g, x, y, hue) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random()*Math.PI*2, sp = 1 + Math.random()*9;
      g.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2,
        life: 1, r: 2+Math.random()*5, hue, type:"death" });
    }
  }

  // ── Collision ─────────────────────────────────────────────────────────────
  function checkBirdCollision(bird, pipes) {
    const { x, y } = bird;
    if (y + BIRD_R >= H - 2 || y - BIRD_R <= 0) return true;
    for (const p of pipes) {
      const inX = x + BIRD_R > p.x + 5 && x - BIRD_R < p.x + PIPE_W - 5;
      if (inX && (y - BIRD_R < p.gapY - 4 || y + BIRD_R > p.gapY + PIPE_GAP + 4)) return true;
    }
    return false;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function update(g) {
    g.frame++;
    const [b1, b2] = g.birds;
    const aliveBefore = [b1.alive, b2.alive];

    // physics for each alive bird
    g.birds.forEach((bird, idx) => {
      if (!bird.alive) return;
      bird.vy += GRAVITY;
      bird.vy  = Math.min(bird.vy, 11);
      bird.y  += bird.vy;
      bird.angle = Math.max(-0.5, Math.min(Math.PI/2.2, bird.vy*0.07));
      bird.trail.push({ x: bird.x, y: bird.y });
      if (bird.trail.length > 14) bird.trail.shift();
    });

    // pipes
    g.pipeTimer++;
    if (g.pipeTimer >= PIPE_INTERVAL) {
      const minY = 70, maxY = H - 70 - PIPE_GAP;
      g.pipes.push({ x: W + 10, gapY: minY + Math.random()*(maxY-minY),
        scored: [false, false], hue: Math.random()*60+160 });
      g.pipeTimer = 0;
    }
    const speed = getPipeSpeed(Math.max(...g.scores));
    g.pipes.forEach(p => (p.x -= speed));
    g.pipes = g.pipes.filter(p => p.x + PIPE_W > -10);

    // per-bird scoring
    let scoresChanged = false;
    g.pipes.forEach(p => {
      g.birds.forEach((bird, idx) => {
        if (!bird.alive) return;
        if (!p.scored[idx] && p.x + PIPE_W < bird.x) {
          p.scored[idx] = true;
          g.scores[idx]++;
          g.shakeMag = 2.5;
          const hue = idx === 0 ? 140 : 300;
          g.scoreTexts.push({ x: bird.x + 20, y: bird.y - 30,
            vy: -2, life: 1, text: "+1", color: idx === 0 ? "#00ffaa" : "#ff66ff" });
          spawnScoreParticles(g, p.x + PIPE_W/2, p.gapY + PIPE_GAP/2, hue);
          scoresChanged = true;
        }
      });
    });
    if (scoresChanged) setScores([...g.scores]);

    // collisions
    g.birds.forEach((bird, idx) => {
      if (!bird.alive) return;
      if (checkBirdCollision(bird, g.pipes)) {
        bird.alive = false;
        g.shakeMag = 10;
        spawnDeathParticles(g, bird.x, bird.y, idx === 0 ? 10 : 290);
      }
    });

    // check if game over
    const bothDead = !b1.alive && !b2.alive;
    const oneDied  = (aliveBefore[0] && !b1.alive) || (aliveBefore[1] && !b2.alive);

    if (bothDead || (oneDied && (!b1.alive || !b2.alive))) {
      // determine winner after a short delay — check next frame if other is also dead
      if (!b1.alive && !b2.alive) {
        stateRef.current = "over";
        let result;
        if (g.scores[0] > g.scores[1]) result = "p1";
        else if (g.scores[1] > g.scores[0]) result = "p2";
        else result = "tie";
        setGameOver(result);
        setScores([...g.scores]);
        setScreen("over");
      } else if (!b1.alive && b2.alive) {
        // p1 dead, p2 still going — let p2 keep going, mark p1 dead
      } else if (!b2.alive && b1.alive) {
        // p2 dead, p1 still going
      }
    }

    // if one died this frame, check if we should end
    if (oneDied) {
      // give 2 second grace: actually end immediately when BOTH are dead
      if (!b1.alive && !b2.alive && stateRef.current === "playing") {
        stateRef.current = "over";
        let result;
        if (g.scores[0] > g.scores[1]) result = "p1";
        else if (g.scores[1] > g.scores[0]) result = "p2";
        else result = "tie";
        setGameOver(result);
        setScores([...g.scores]);
        setScreen("over");
      }
    }

    // particles / score texts
    g.particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.vx*=0.97; p.life-=0.022; });
    g.particles  = g.particles.filter(p => p.life > 0);
    g.scoreTexts.forEach(t => { t.y+=t.vy; t.life-=0.025; });
    g.scoreTexts = g.scoreTexts.filter(t => t.life > 0);

    // shake
    if (g.shakeMag > 0) {
      g.shakeX = (Math.random()-0.5)*g.shakeMag*2;
      g.shakeY = (Math.random()-0.5)*g.shakeMag*2;
      g.shakeMag *= 0.75;
      if (g.shakeMag < 0.3) { g.shakeMag=0; g.shakeX=0; g.shakeY=0; }
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
    g.birds.forEach((bird, idx) => drawBird(ctx, bird, idx, idx === 0 ? spriteRef.current : sprite2Ref.current));
    drawScoreTexts(ctx, g.scoreTexts);
    // split line
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawBg(ctx, g) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   "#02000c");
    grad.addColorStop(0.5, "#080018");
    grad.addColorStop(1,   "#000610");
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    const t = g.frame*0.003;
    [{x:120,y:120,r:160,hue:280,a:0.07},{x:600,y:320,r:200,hue:200,a:0.06},
     {x:360,y:250,r:130,hue:320,a:0.045},{x:820,y:100,r:120,hue:260,a:0.05}
    ].forEach(b => {
      const ox=Math.sin(t+b.x)*14, oy=Math.cos(t*1.3+b.y)*10;
      const ng=ctx.createRadialGradient(b.x+ox,b.y+oy,0,b.x+ox,b.y+oy,b.r);
      ng.addColorStop(0,`hsla(${b.hue},100%,60%,${b.a})`); ng.addColorStop(1,"transparent");
      ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(b.x+ox,b.y+oy,b.r,0,Math.PI*2); ctx.fill();
    });

    g.stars.forEach(s => {
      s.twinkle+=0.04;
      ctx.fillStyle=`rgba(255,255,255,${0.2+0.8*Math.abs(Math.sin(s.twinkle))*s.z})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*s.z,0,Math.PI*2); ctx.fill();
      if (stateRef.current==="playing") {
        s.x-=s.speed*s.z;
        if(s.x<0){s.x=W;s.y=Math.random()*H;}
      }
    });

    ctx.fillStyle="rgba(0,0,0,0.035)";
    for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,2);
  }

  function drawPipe(ctx, pipe) {
    const {hue,x,gapY}=pipe; const botY=gapY+PIPE_GAP;
    ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=20;
    const mkG=()=>{const g=ctx.createLinearGradient(x,0,x+PIPE_W,0);
      g.addColorStop(0,`hsl(${hue},80%,20%)`);g.addColorStop(0.35,`hsl(${hue},90%,42%)`);g.addColorStop(1,`hsl(${hue},70%,16%)`);return g;};
    ctx.fillStyle=mkG(); ctx.fillRect(x,0,PIPE_W,gapY);
    ctx.fillStyle=`hsl(${hue},100%,56%)`; ctx.fillRect(x-6,gapY-24,PIPE_W+12,24);
    ctx.fillStyle=mkG(); ctx.fillRect(x,botY,PIPE_W,H-botY);
    ctx.fillStyle=`hsl(${hue},100%,56%)`; ctx.fillRect(x-6,botY,PIPE_W+12,24);
    ctx.fillStyle=`hsla(${hue},100%,92%,0.15)`;
    ctx.fillRect(x+5,0,5,gapY); ctx.fillRect(x+5,botY,5,H-botY);
    ctx.shadowBlur=0;
  }

  function drawBird(ctx, bird, idx, sprite) {
    const {x,y,angle,trail} = bird;
    const SIZE = 30;
    const hue  = idx === 0 ? 140 : 300;
    const col  = idx === 0 ? "#00ffaa" : "#ff66ff";

    // dead: draw faded X
    if (!bird.alive) {
      ctx.save(); ctx.globalAlpha=0.35; ctx.translate(x,y); ctx.rotate(angle);
      ctx.strokeStyle=col; ctx.lineWidth=3; ctx.shadowColor=col; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.moveTo(-10,-10); ctx.lineTo(10,10); ctx.moveTo(10,-10); ctx.lineTo(-10,10); ctx.stroke();
      ctx.restore(); ctx.globalAlpha=1; return;
    }

    // trail
    trail.forEach((t,i)=>{
      ctx.fillStyle=`hsla(${hue},100%,65%,${(i/trail.length)*0.4})`;
      ctx.beginPath(); ctx.arc(t.x,t.y,9*(i/trail.length),0,Math.PI*2); ctx.fill();
    });

    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);

    // aura
    const aura=ctx.createRadialGradient(0,0,4,0,0,SIZE+10);
    aura.addColorStop(0,`hsla(${hue},100%,70%,0.45)`);
    aura.addColorStop(0.5,`hsla(${hue},100%,50%,0.2)`);
    aura.addColorStop(1,"transparent");
    ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,SIZE+10,0,Math.PI*2); ctx.fill();

    if (sprite) {
      ctx.shadowColor=col; ctx.shadowBlur=18;
      ctx.drawImage(sprite,-SIZE,-SIZE,SIZE*2,SIZE*2);
      ctx.shadowBlur=0;
    } else {
      ctx.shadowColor=col; ctx.shadowBlur=18;
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.arc(0,0,SIZE*0.75,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }

    // player label above bird
    ctx.font="bold 11px 'Orbitron',monospace";
    ctx.fillStyle=col; ctx.textAlign="center"; ctx.shadowColor=col; ctx.shadowBlur=8;
    ctx.fillText(idx===0?"P1":"P2", 0, -SIZE-6);
    ctx.shadowBlur=0; ctx.textAlign="left";

    ctx.restore();
  }

  function drawParticles(ctx, particles) {
    particles.forEach(p=>{
      ctx.globalAlpha=p.life; ctx.shadowColor=`hsl(${p.hue},100%,60%)`; ctx.shadowBlur=8;
      if(p.type==="ring"){
        ctx.strokeStyle=`hsl(${p.hue},100%,70%)`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(1-p.life)*20,0,Math.PI*2); ctx.stroke();
      } else {
        const pg=ctx.createRadialGradient(p.x-p.r*0.3*p.life,p.y-p.r*0.3*p.life,0,p.x,p.y,p.r*p.life);
        pg.addColorStop(0,`hsl(${p.hue},100%,90%)`); pg.addColorStop(0.5,`hsl(${p.hue},100%,60%)`); pg.addColorStop(1,`hsl(${p.hue},80%,30%)`);
        ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
      }
    });
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }

  function drawScoreTexts(ctx, texts) {
    texts.forEach(t=>{
      ctx.globalAlpha=t.life; ctx.font="bold 18px 'Orbitron',monospace";
      ctx.fillStyle=t.color; ctx.shadowColor=t.color; ctx.shadowBlur=10;
      ctx.textAlign="center"; ctx.fillText(t.text,t.x,t.y);
    });
    ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.textAlign="left";
  }

  function drawGround(ctx) {
    ctx.fillStyle="rgba(255,0,255,0.06)"; ctx.fillRect(0,H-6,W,6);
    ctx.shadowColor="#ff00ff"; ctx.shadowBlur=16;
    ctx.strokeStyle="#ff00ff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,H-2); ctx.lineTo(W,H-2); ctx.stroke();
    ctx.shadowBlur=0;
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    gameRef.current=makeGameState();

    function loop(){
      const g=gameRef.current;
      if(stateRef.current==="playing"){
        update(g);
      } else {
        g.frame++;
        g.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.vx*=0.97;p.life-=0.022;});
        g.particles=g.particles.filter(p=>p.life>0);
        g.stars.forEach(s=>{s.twinkle+=0.04;});
        if(g.shakeMag>0){
          g.shakeX=(Math.random()-0.5)*g.shakeMag*2; g.shakeY=(Math.random()-0.5)*g.shakeMag*2;
          g.shakeMag*=0.75; if(g.shakeMag<0.3){g.shakeMag=0;g.shakeX=0;g.shakeY=0;}
        }
        if(stateRef.current==="idle"){
          g.birds[0].y=H/2+Math.sin(g.frame*0.04)*12;
          g.birds[1].y=H/2+Math.sin(g.frame*0.04+1)*14;
        }
      }
      draw(ctx,g);
      rafRef.current=requestAnimationFrame(loop);
    }
    rafRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[]);

  // ── Input ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{
      if(e.code==="Space")    { e.preventDefault(); flapBird(0); }
      if(e.code==="Enter")    { e.preventDefault(); flapBird(1); }
      if(e.code==="ArrowUp")  { e.preventDefault(); flapBird(0); }
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[flapBird]);

  // click handler — left half = P1, right half = P2
  const handleClick = useCallback((e)=>{
    const rect = canvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    // account for CSS scale
    const scale = rect.width / W;
    const cx = (e.clientX - rect.left) / scale;
    if(cx < W/2) flapBird(0);
    else          flapBird(1);
  },[flapBird]);

  // ── Render ────────────────────────────────────────────────────────────────
  const winner = gameOver === "p1" ? "PLAYER 1 WINS" : gameOver === "p2" ? "PLAYER 2 WINS" : "TIE GAME";
  const winCol  = gameOver === "p1" ? "#00ffaa" : gameOver === "p2" ? "#ff66ff" : "#ffff00";

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div ref={wrapRef} style={styles.wrapper}>
        <canvas ref={canvasRef} width={W} height={H} style={styles.canvas} onClick={handleClick}/>

        {/* HUD */}
        {screen==="playing" && (
          <div style={styles.hud}>
            <div style={{...styles.playerScore, left:20, color:"#00ffaa", textShadow:"0 0 16px #00ffaa"}}>
              P1: {scores[0]}
            </div>
            <div style={{...styles.playerScore, right:20, left:"auto", color:"#ff66ff", textShadow:"0 0 16px #ff66ff"}}>
              P2: {scores[1]}
            </div>
            <div style={styles.controls}>
              <span style={{color:"#00ffaa88"}}>SPACE / LEFT CLICK</span>
              <span style={{color:"#ffffff33", margin:"0 12px"}}>·</span>
              <span style={{color:"#ff66ff88"}}>ENTER / RIGHT CLICK</span>
            </div>
          </div>
        )}

        {/* Idle */}
        {screen==="idle" && (
          <div style={styles.overlay} onClick={()=>{flapBird(0);flapBird(1);}}>
            <h1 style={styles.title}>FLAPPY SURGE</h1>
            <div style={styles.tagline}>2 PLAYER MODE</div>
            <div style={styles.playerHints}>
              <div style={{color:"#00ffaa", textShadow:"0 0 12px #00ffaa"}}>P1 — SPACE / LEFT CLICK</div>
              <div style={{color:"#ff66ff", textShadow:"0 0 12px #ff66ff"}}>P2 — ENTER / RIGHT CLICK</div>
            </div>
            <div style={styles.tapHint}>ANY KEY TO START</div>
          </div>
        )}

        {/* Game Over */}
        {screen==="over" && (
          <div style={styles.overlay} onClick={()=>{flapBird(0);}}>
            <div style={{...styles.winnerText, color:winCol, textShadow:`0 0 30px ${winCol}`}}>{winner}</div>
            <div style={styles.finalScores}>
              <span style={{color:"#00ffaa"}}>P1: {scores[0]}</span>
              <span style={{color:"#ffffff44", margin:"0 20px"}}>VS</span>
              <span style={{color:"#ff66ff"}}>P2: {scores[1]}</span>
            </div>
            <div style={{...styles.tapHint, marginTop:28}}>CLICK TO PLAY AGAIN</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const font = "'Orbitron', monospace";
const styles = {
  page:    { position:"fixed", inset:0, background:"#000", overflow:"hidden" },
  wrapper: { position:"absolute", width:W, height:H, userSelect:"none" },
  canvas:  { display:"block", width:W, height:H, boxShadow:"0 0 80px #ff00ff66, 0 0 160px #00ffff33" },
  hud:     { position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none" },
  playerScore: {
    position:"absolute", top:16, fontFamily:font, fontSize:28, fontWeight:900,
    letterSpacing:3, pointerEvents:"none",
  },
  controls: {
    position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)",
    fontFamily:font, fontSize:10, letterSpacing:2, whiteSpace:"nowrap",
  },
  overlay: {
    position:"absolute", top:0, left:0, width:"100%", height:"100%",
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", cursor:"pointer",
  },
  title: {
    fontFamily:font, fontSize:54, fontWeight:900, color:"#fff",
    textShadow:"0 0 30px #ff00ff, 0 0 70px #ff00ff88",
    letterSpacing:8, textAlign:"center", marginBottom:8,
  },
  tagline: { fontFamily:font, fontSize:13, color:"#ff00ffaa", letterSpacing:5, marginBottom:28 },
  playerHints: {
    display:"flex", flexDirection:"column", alignItems:"center", gap:10,
    fontFamily:font, fontSize:13, letterSpacing:3, marginBottom:32,
  },
  tapHint: {
    fontFamily:font, fontSize:12, color:"#fff", letterSpacing:3,
    border:"1px solid #ffffff33", padding:"10px 28px", borderRadius:2,
  },
  winnerText: {
    fontFamily:font, fontSize:44, fontWeight:900, letterSpacing:6, marginBottom:16,
  },
  finalScores: {
    fontFamily:font, fontSize:32, fontWeight:900, letterSpacing:4, marginBottom:8,
  },
};