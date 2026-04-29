// ———script.js———
// Two things happen here:
// 1. Boid simulation drawn on a background canvas (triangles that flock)
// 2. Scroll fade-in for page sections

// ============================================================
// ———Part 1: Boid Canvas Simulation———
// ============================================================

const canvas = document.getElementById("boid-canvas");
const ctx    = canvas.getContext("2d");

let followMode = false;
let followedBoid = null;

// ———Config———
const MAX_BOIDS    = 12;
const BOID_SIZE    = 7;
const SPEED        = 1.2;
const MARGIN       = 80;

const SEPARATION_DIST   = 32;   // increased from 22 to reduce overlapping
const SEPARATION_FORCE  = 0.28; // stronger push to match larger radius
const ALIGNMENT_DIST    = 80;
const ALIGNMENT_FORCE   = 0.03;
const COHESION_DIST     = 100;
const COHESION_FORCE    = 0.005;

let leftLane  = { x: 0, width: 0 };
let rightLane = { x: 0, width: 0 };
const CONTENT_WIDTH = 760;

function updateLanes() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const centerX = window.innerWidth / 2;
  const half    = CONTENT_WIDTH / 2;

  leftLane  = { x: 0,          width: Math.max(0, centerX - half) };
  rightLane = { x: centerX + half, width: Math.max(0, centerX - half) };
}

class Boid {
  constructor() {
    this.wanderAngle = Math.random() * Math.PI * 2; // [NOTE] per-boid angle that slowly random-walks each frame
    this.spawn();
  }

  spawn() {
    const side = Math.random() < 0.5 ? "left" : "right";
    const lane = side === "left" ? leftLane : rightLane;

    if (lane.width < 10) {
      this.x = -100;
      this.y = Math.random() * window.innerHeight;
    } else {
      this.x = lane.x + Math.random() * lane.width;
      this.y = Math.random() * window.innerHeight;
    }

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.opacity = 0;
  }

  applyRules(boids) {
    let sepX = 0, sepY = 0, sepCount = 0;
    let alignVX = 0, alignVY = 0, alignCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;

    for (const other of boids) {
      if (other === this) continue;
      const dx   = other.x - this.x;
      const dy   = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SEPARATION_DIST && dist > 0) {
        sepX -= dx / dist; sepY -= dy / dist; sepCount++;
      }
      if (dist < ALIGNMENT_DIST) {
        alignVX += other.vx; alignVY += other.vy; alignCount++;
      }
      if (dist < COHESION_DIST) {
        cohX += other.x; cohY += other.y; cohCount++;
      }
    }

    if (sepCount   > 0) {
      this.vx += (sepX / sepCount) * SEPARATION_FORCE;
      this.vy += (sepY / sepCount) * SEPARATION_FORCE;
    }
    if (alignCount > 0) {
      this.vx += ((alignVX / alignCount) - this.vx) * ALIGNMENT_FORCE;
      this.vy += ((alignVY / alignCount) - this.vy) * ALIGNMENT_FORCE;
    }
    if (cohCount   > 0) {
      this.vx += ((cohX / cohCount) - this.x) * COHESION_FORCE;
      this.vy += ((cohY / cohCount) - this.y) * COHESION_FORCE;
    }

    // Mouse repulsion
    if (typeof mouse !== 'undefined') {
      const mdx = this.x - mouse.x;
      const mdy = this.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < MOUSE_DIST && mdist > 0) {
        const strength = (1 - mdist / MOUSE_DIST) * MOUSE_FORCE;
        this.vx += (mdx / mdist) * strength;
        this.vy += (mdy / mdist) * strength;
      }
    }

    // Content column avoidance
    const contentLeft  = leftLane.x + leftLane.width;
    const contentRight = rightLane.x;
    const AVOID_ZONE   = 60;
    if (this.x > contentLeft - AVOID_ZONE && this.x < contentRight + AVOID_ZONE) {
      const distLeft  = this.x - contentLeft;
      const distRight = contentRight - this.x;
      if (distLeft < AVOID_ZONE && distLeft >= 0)   this.vx += 0.25 * (1 - distLeft  / AVOID_ZONE);
      else if (distLeft < 0)                         this.vx -= 0.25 * Math.min(1, -distLeft  / AVOID_ZONE);
      if (distRight < AVOID_ZONE && distRight >= 0)  this.vx -= 0.25 * (1 - distRight / AVOID_ZONE);
      else if (distRight < 0)                        this.vx += 0.25 * Math.min(1, -distRight / AVOID_ZONE);
    }

    // Clamp speed
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > SPEED * 1.8) { this.vx = (this.vx / spd) * SPEED * 1.8; this.vy = (this.vy / spd) * SPEED * 1.8; }
    if (spd < SPEED * 0.4) { this.vx = (this.vx / spd) * SPEED * 0.4; this.vy = (this.vy / spd) * SPEED * 0.4; }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.opacity < 1) this.opacity = Math.min(1, this.opacity + 0.02);

    // [NOTE] Hard respawn only if a boid somehow escapes very far — bounce should prevent this
    const off =
      this.x < -300 || this.x > window.innerWidth  + 300 ||
      this.y < -300 || this.y > window.innerHeight + 300;
    if (off) this.spawn();
  }

  draw() {
    const angle = Math.atan2(this.vy, this.vx);
    const s     = BOID_SIZE;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.globalAlpha = this.opacity * 0.45;

    ctx.beginPath();
    ctx.moveTo(s * 1.5,  0);
    ctx.lineTo(-s,        s * 0.75);
    ctx.lineTo(-s * 0.5,  0);
    ctx.lineTo(-s,       -s * 0.75);
    ctx.closePath();

    ctx.fillStyle = getComputedStyle(document.documentElement)
                      .getPropertyValue("--accent").trim();
    ctx.fill();
    ctx.restore();
  }
}

// ———Mouse position (for repulsion)———
const mouse = { x: -9999, y: -9999 };
const MOUSE_DIST  = 160;
const MOUSE_FORCE = 2.5;

window.addEventListener("mousemove", function(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mouseleave", function() {
  mouse.x = -9999;
  mouse.y = -9999;
});

// ———Ghost repeller: invisible force that teleports every 15–30s———
const ghost = { x: -9999, y: -9999, strength: 0 };
const GHOST_DIST  = 120;
const GHOST_FORCE = 2.0;

function moveGhost() {
  ghost.x = 80 + Math.random() * (window.innerWidth  - 160);
  ghost.y = 80 + Math.random() * (window.innerHeight - 160);
  ghost.strength = 1.0;
  const fadeInterval = setInterval(function() {
    ghost.strength = Math.max(0, ghost.strength - 0.016);
    if (ghost.strength <= 0) {
      clearInterval(fadeInterval);
      ghost.x = -9999; ghost.y = -9999;
      setTimeout(moveGhost, 15000 + Math.random() * 15000);
    }
  }, 16);
}
setTimeout(moveGhost, 15000 + Math.random() * 15000);

// ———Second ghost repeller: offset timing so they don't always fire together———
const ghost2 = { x: -9999, y: -9999, strength: 0 };
const GHOST2_DIST  = 100;
const GHOST2_FORCE = 1.8;

function moveGhost2() {
  ghost2.x = 80 + Math.random() * (window.innerWidth  - 160);
  ghost2.y = 80 + Math.random() * (window.innerHeight - 160);
  ghost2.strength = 1.0;
  const fadeInterval = setInterval(function() {
    ghost2.strength = Math.max(0, ghost2.strength - 0.016);
    if (ghost2.strength <= 0) {
      clearInterval(fadeInterval);
      ghost2.x = -9999; ghost2.y = -9999;
      setTimeout(moveGhost2, 15000 + Math.random() * 15000);
    }
  }, 16);
}
// Offset by ~8s so both ghosts rarely fire at the same time
setTimeout(moveGhost2, 8000 + Math.random() * 15000);

// ———Controls box bounds (updated each frame for repulsion)———
// [NOTE] null when not found; populated after DOM ready
let controlsBoxRect = null;
function updateControlsBoxRect() {
  const box = document.querySelector(".boid-controls-box");
  if (box) controlsBoxRect = box.getBoundingClientRect();
}

updateLanes();
const boids = [];
for (let i = 0; i < MAX_BOIDS; i++) boids.push(new Boid());

function animate() {
  // [CRITICAL] Always reset transform BEFORE clearing
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (document.body.classList.contains('focus-mode')) {
    updateControlsBoxRect();
  } else {
    controlsBoxRect = null;
  }

  for (const b of boids) {
    b.applyRules(boids);
    b.update();
    b.draw();
  }

  if (followMode) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = "12px monospace";
    ctx.textAlign = "right";

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.fillStyle = isDark ? "white" : "black";

    const x = canvas.width - 20;
    const y = canvas.height - 100;

    ctx.fillText("YELLOW: Vision Radius", x, y);
    ctx.fillText("RED DOTTED CIRCLE: Separation Radius", x, y + 20);
    ctx.fillText("RED: Separation (per neighbor)", x, y + 40);
    ctx.fillText("BLUE: Alignment", x, y + 60);
    ctx.fillText("GREEN: Cohesion", x, y + 80);
  }

  requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize", updateLanes);


// ============================================================
// ———Part 3: Dark Mode Toggle———
// ============================================================

// ———Icon strings for the toggle button———
const ICON_MOON = `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="
    M10.5 1.5
    C6.5 1.5 3.8 4.5 3.8 7
    C3.8 9.5 6.5 12.5 10.5 12.5
    C8.5 11.2 7.6 9.3 7.6 7
    C7.6 4.7 8.5 2.8 10.5 1.5
    Z
  "/>
</svg>`;

const ICON_SUN = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
  <!-- 8 ray lines radiating outward -->
  <line x1="7" y1="0.5" x2="7" y2="2.5"   stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="0.5" y1="7" x2="2.5" y2="7"   stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="11.5" y1="7" x2="13.5" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="2.4" y1="2.4" x2="3.8" y2="3.8"   stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="10.2" y1="10.2" x2="11.6" y2="11.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="11.6" y1="2.4" x2="10.2" y2="3.8"   stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="3.8" y1="10.2" x2="2.4" y2="11.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

// Restore preference from last visit
const themeBtn = document.getElementById("theme-toggle");

if (localStorage.getItem("theme") === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeBtn.innerHTML = ICON_SUN;
} else {
  themeBtn.innerHTML = ICON_MOON;
}

themeBtn.addEventListener("click", function() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    themeBtn.innerHTML = ICON_MOON;
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    themeBtn.innerHTML = ICON_SUN;
    localStorage.setItem("theme", "dark");
  }
});

// ============================================================
// ———Focus Mode Toggle———
// Hides all article content and pins the controls panel to the
// bottom-left corner so users can interact without distractions.
// ============================================================

const focusBtn = document.getElementById("focus-toggle");

focusBtn.addEventListener("click", function() {
  const isFocused = document.body.classList.toggle("focus-mode");
  // Update button icon: show "exit" X when active, target icon when inactive
  focusBtn.innerHTML = isFocused ? "&#x2715;" : "&#x26F6;";
  focusBtn.title = isFocused ? "Exit focus mode" : "Focus mode: hide article, pin controls";
});

// ============================================================
// ———Follow Mode Toggle———
// Follow a random individual boid.
// ============================================================

const followBtn = document.getElementById("follow-toggle");

followBtn.addEventListener("click", function() {
  followMode = !followMode;

  document.body.classList.toggle("follow-mode", followMode);

  if (followMode && boids.length > 0) {
    followedBoid = boids[Math.floor(Math.random() * boids.length)];
  } else {
    followedBoid = null;
  }

  // [OPTIONAL UI]
  followBtn.innerHTML = followMode ? "&#10006;" : "&#128065;";
  followBtn.title = followMode ? "Exit follow mode" : "Follow a boid";
});

// ============================================================
// ———Part 2: Boid Control Panel (Fig. 3)———
// Sliders directly mutate the live config variables used by
// applyRules() and draw() — no restart needed.
// ============================================================

// [NOTE] These mirror the const values declared above.
// We shadow them with let-bindings that the controls mutate.
let cfg = {
  sepForce:   0.15,  // [NOTE] lower than before — sep now sums not averages, so same force hits harder
  alignForce: 0.06,
  cohForce:   0.001,
  sepDist:    32,
  visionDist: 95,
  boidSize:   12,
  speed:      4.0,
  count:      40,
  turnDamp:   0.0,
  wander:     0.04,
};

const DEFAULTS = { ...cfg };

// ———Wire each slider to cfg and live-update the readout———
function wire(inputId, outputId, cfgKey, fmt) {
  const input  = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (!input || !output) return;
  input.addEventListener("input", function() {
    cfg[cfgKey] = parseFloat(this.value);
    output.textContent = fmt(cfg[cfgKey]);
    // [NOTE] If count changed, resize the boids array
    if (cfgKey === "count") syncBoidCount();
  });
}

wire("ctrl-sep-force",   "out-sep-force",   "sepForce",   v => v.toFixed(2));
wire("ctrl-align-force", "out-align-force", "alignForce", v => v.toFixed(3));
wire("ctrl-coh-force",   "out-coh-force",   "cohForce",   v => v.toFixed(3));
wire("ctrl-sep-dist",    "out-sep-dist",    "sepDist",    v => v.toFixed(0) + " px");
wire("ctrl-vision",      "out-vision",      "visionDist", v => v.toFixed(0) + " px");
wire("ctrl-size",        "out-size",        "boidSize",   v => v.toFixed(0) + " px");
wire("ctrl-speed",       "out-speed",       "speed",      v => v.toFixed(1));
wire("ctrl-count",       "out-count",       "count",      v => v.toFixed(0));
wire("ctrl-wander",      "out-wander",      "wander",     v => v.toFixed(3));

// ———Add / remove boids to match cfg.count———
function syncBoidCount() {
  while (boids.length < cfg.count) boids.push(new Boid());
  while (boids.length > cfg.count) boids.pop();
}

// ———Reset button (now in presets row)———
document.getElementById("ctrl-reset").addEventListener("click", function() {
  cfg = { ...DEFAULTS };
  syncBoidCount();
  syncSlidersFromCfg();
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
});

// ============================================================
// ———Part 4: Presets———
// ============================================================

const PRESETS = {
  // Your exact specified values
  birds: {
    sepForce: 0.32, alignForce: 0.04, cohForce: 0.008,
    sepDist: 30, visionDist: 85, boidSize: 14, speed: 10.0, count: 80,
    turnDamp: 0.0, wander: 0.18
  },

  // Fluid sweeping arcs, spread-out school
  fish: {
    sepForce: 0.38, alignForce: 0.165, cohForce: 0.016,
    sepDist: 34, visionDist: 115, boidSize: 11, speed: 5.5, count: 90,
    turnDamp: 0.60, wander: 0.2
  },

  // Gnat/midge swarm — anchored center, chaotic individuals
  insects: {
    sepForce: 0.20, alignForce: 0.005, cohForce: 0.006,
    sepDist: 18, visionDist: 120, boidSize: 3, speed: 5.5, count: 100,
    turnDamp: 0.0, wander: 0.3
  },

  // Dense pedestrian crowd — large boids, packed but spaced
  crowd: {
    sepForce: 0.20, alignForce: 0.1, cohForce: 0.0015,
    sepDist: 72, visionDist: 70, boidSize: 22, speed: 2, count: 200,
    turnDamp: 0.50, wander: 0.015
  },

};

// ———Sync all sliders to current cfg———
function syncSlidersFromCfg() {
  document.getElementById("ctrl-sep-force").value    = cfg.sepForce;
  document.getElementById("out-sep-force").textContent = cfg.sepForce.toFixed(2);
  document.getElementById("ctrl-align-force").value  = cfg.alignForce;
  document.getElementById("out-align-force").textContent = cfg.alignForce.toFixed(3);
  document.getElementById("ctrl-coh-force").value    = cfg.cohForce;
  document.getElementById("out-coh-force").textContent = cfg.cohForce.toFixed(3);
  document.getElementById("ctrl-sep-dist").value     = cfg.sepDist;
  document.getElementById("out-sep-dist").textContent = cfg.sepDist + " px";
  document.getElementById("ctrl-vision").value       = cfg.visionDist;
  document.getElementById("out-vision").textContent  = cfg.visionDist + " px";
  document.getElementById("ctrl-speed").value        = cfg.speed;
  document.getElementById("out-speed").textContent   = cfg.speed.toFixed(1);
  document.getElementById("ctrl-size").value         = cfg.boidSize;
  document.getElementById("out-size").textContent    = cfg.boidSize + " px";
  document.getElementById("ctrl-count").value        = cfg.count;
  document.getElementById("out-count").textContent   = cfg.count;
  document.getElementById("ctrl-wander").value       = cfg.wander ?? 0.04;
  document.getElementById("out-wander").textContent  = (cfg.wander ?? 0.04).toFixed(3);
}

// ———Grid spawn: divides the FULL screen into cells, shuffles them,
// places exactly one boid per cell so spawn is always spread out.
function spawnGrid() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  // [NOTE] cell size = 1.5× sep radius so no two boids start inside each other's space
  const cellSize = Math.max(cfg.sepDist * 1.5, 30);
  const cols = Math.max(1, Math.floor(W / cellSize));
  const rows = Math.max(1, Math.floor(H / cellSize));
  const cellW = W / cols;
  const cellH = H / rows;

  // Build a list of all cell indices, then shuffle it
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c });
    }
  }
  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
  }

  // Assign one boid per cell (wrap around if more boids than cells)
  for (let i = 0; i < boids.length; i++) {
    const { r, c } = cells[i % cells.length];
    const b = boids[i];
    // Center of cell + up to 35% random jitter so it's not a perfect grid
    b.x = (c + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.35;
    b.y = (r + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.35;
    const angle = Math.random() * Math.PI * 2;
    b.vx = Math.cos(angle) * cfg.speed;
    b.vy = Math.sin(angle) * cfg.speed;
    b.opacity = 0;
  }
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  cfg = { ...p };
  syncBoidCount();
  // [FIX] crowd: respawn all boids on a grid so none start overlapping
  if (name === "crowd") spawnGrid();
  syncSlidersFromCfg();
  document.querySelectorAll(".preset-btn").forEach(function(btn) {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });
}

document.querySelectorAll(".preset-btn[data-preset]").forEach(function(btn) {
  btn.addEventListener("click", function() { applyPreset(this.dataset.preset); });
});

// ———Randomize button———
document.getElementById("ctrl-randomize").addEventListener("click", function() {
  function rnd(lo, hi) { return Math.round((lo + Math.random() * (hi - lo)) * 1000) / 1000; }
  cfg = {
    sepForce:   rnd(0.02, 0.30),
    alignForce: rnd(0.00, 0.12),
    cohForce:   rnd(0.0001, 0.006),
    sepDist:    Math.round(rnd(8, 80)),
    visionDist: Math.round(rnd(30, 200) / 5) * 5,
    boidSize:   Math.round(rnd(3, 22)),
    speed:      rnd(0.4, 10.0),
    count:      Math.round(rnd(10, 100)),
    turnDamp:   rnd(0.0, 0.5),
    wander:     rnd(0.0, 0.25),
  };
  syncBoidCount();
  syncSlidersFromCfg();
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
});

// Clear active preset state when user manually moves a slider
document.querySelectorAll("input[type='range']").forEach(function(input) {
  input.addEventListener("input", function() {
    document.querySelectorAll(".preset-btn").forEach(function(btn) {
      btn.classList.remove("active");
    });
  });
});
// the original frozen consts. We redefine applyRules and draw
// on the prototype so all existing instances pick it up.
// ============================================================

Boid.prototype.applyRules = function(boids) {
  // Store heading before rules run — used for turn smoothing at the end
  const spd0 = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  const prevNx = spd0 > 0 ? this.vx / spd0 : 0;
  const prevNy = spd0 > 0 ? this.vy / spd0 : 0;

  let sepX = 0, sepY = 0, sepCount = 0;
  let alignVX = 0, alignVY = 0, alignCount = 0;
  let cohX = 0, cohY = 0, cohCount = 0;

  for (const other of boids) {
    if (other === this) continue;
    const dx   = other.x - this.x;
    const dy   = other.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < cfg.sepDist && dist > 0) {
      // [FIX] Scale by proximity: boids very close push much harder than boids at edge of sep radius
      const proximity = 1 - (dist / cfg.sepDist);
      sepX -= (dx / dist) * proximity;
      sepY -= (dy / dist) * proximity;
      sepCount++;
    }
    if (dist < cfg.visionDist) {
      alignVX += other.vx; alignVY += other.vy; alignCount++;
      cohX += other.x; cohY += other.y; cohCount++;
    }
  }

  if (sepCount   > 0) {
    // [FIX] Do NOT divide by sepCount — summing means more neighbors = stronger push.
    // Averaging was diluting the force in dense groups, causing overlap.
    this.vx += sepX * cfg.sepForce;
    this.vy += sepY * cfg.sepForce;
  }
  if (alignCount > 0) {
    this.vx += ((alignVX / alignCount) - this.vx) * cfg.alignForce;
    this.vy += ((alignVY / alignCount) - this.vy) * cfg.alignForce;
  }
  if (cohCount   > 0) {
    this.vx += ((cohX / cohCount) - this.x) * cfg.cohForce;
    this.vy += ((cohY / cohCount) - this.y) * cfg.cohForce;
  }

  // ———Mouse repulsion (same mechanic as boid separation)———
  const mdx  = this.x - mouse.x;
  const mdy  = this.y - mouse.y;
  const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
  if (mdist < MOUSE_DIST && mdist > 0) {
    const strength = (1 - mdist / MOUSE_DIST) * MOUSE_FORCE;
    this.vx += (mdx / mdist) * strength;
    this.vy += (mdy / mdist) * strength;
  }

  // ———Ghost repeller: invisible roaming force———
  if (ghost.strength > 0) {
    const gdx = this.x - ghost.x;
    const gdy = this.y - ghost.y;
    const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (gdist < GHOST_DIST && gdist > 0) {
      const gstrength = ghost.strength * (1 - gdist / GHOST_DIST) * GHOST_FORCE;
      this.vx += (gdx / gdist) * gstrength;
      this.vy += (gdy / gdist) * gstrength;
    }
  }

  // ———Second ghost repeller———
  if (ghost2.strength > 0) {
    const g2dx = this.x - ghost2.x;
    const g2dy = this.y - ghost2.y;
    const g2dist = Math.sqrt(g2dx * g2dx + g2dy * g2dy);
    if (g2dist < GHOST2_DIST && g2dist > 0) {
      const g2strength = ghost2.strength * (1 - g2dist / GHOST2_DIST) * GHOST2_FORCE;
      this.vx += (g2dx / g2dist) * g2strength;
      this.vy += (g2dy / g2dist) * g2strength;
    }
  }




if (controlsBoxRect && document.body.classList.contains('focus-mode')) {
  const r = controlsBoxRect;
  const PADDING = 60;

  if (this.x > r.left - PADDING && this.x < r.right + PADDING &&
      this.y > r.top - PADDING && this.y < r.bottom + PADDING) {
    
    // Distance to each edge
    const dLeft   = this.x - r.left;
    const dRight  = r.right - this.x;
    const dTop    = this.y - r.top;
    const dBottom = r.bottom - this.y;
    
    const FORCE = 5.0;
    
    // Behind (left of box) → push RIGHT
    if (dLeft < PADDING && dLeft < dRight) {
      this.vx += FORCE * (1 - dLeft / PADDING);
    }
    
    // Below box → push UP
    if (dBottom < 0) {
      this.vy -= FORCE;
    }
    
    // Inside top area → push UP and RIGHT
    if (dTop < PADDING && dTop >= 0) {
      this.vy -= FORCE * (1 - dTop / PADDING);
      this.vx += FORCE * (1 - dTop / PADDING) * 0.5;
    }
    
    // Right side gets weak rightward nudge too
    if (dRight < PADDING && dRight < dLeft) {
      this.vx += FORCE * 0.3;
    }
  }
}

  // ———Content column avoidance (stronger ramp)———
  const contentLeft  = leftLane.x + leftLane.width;
  const contentRight = rightLane.x;
  const AVOID_ZONE   = 60; // px from edge where force starts ramping up

  if (this.x > contentLeft - AVOID_ZONE && this.x < contentRight + AVOID_ZONE) {
    // inside or near the content column
    const distLeft  = this.x - contentLeft;
    const distRight = contentRight - this.x;

    if (distLeft < AVOID_ZONE && distLeft >= 0) {
      // just inside left edge — push right
      this.vx += 0.25 * (1 - distLeft / AVOID_ZONE);
    } else if (distLeft < 0) {
      // approaching from left — push left
      this.vx -= 0.25 * Math.min(1, -distLeft / AVOID_ZONE);
    }

    if (distRight < AVOID_ZONE && distRight >= 0) {
      // just inside right edge — push left
      this.vx -= 0.25 * (1 - distRight / AVOID_ZONE);
    } else if (distRight < 0) {
      // approaching from right — push right
      this.vx += 0.25 * Math.min(1, -distRight / AVOID_ZONE);
    }
  }

  // ———Edge bounce: repel boids away from screen edges like a soft wall———
  // Wide zone means force starts early but is gentle far out, strong near the wall.
  // Boids can get right up to the edge — the force is proportional to closeness.
  const EDGE_ZONE  = 140;  // wider zone = force starts earlier, boids can still get close
  const EDGE_FORCE = 3.0;
  const W = window.innerWidth;
  const H = window.innerHeight;

  if (this.x < EDGE_ZONE)       this.vx += EDGE_FORCE * (1 - this.x / EDGE_ZONE);
  if (this.x > W - EDGE_ZONE)   this.vx -= EDGE_FORCE * (1 - (W - this.x) / EDGE_ZONE);
  if (this.y < EDGE_ZONE)       this.vy += EDGE_FORCE * (1 - this.y / EDGE_ZONE);
  if (this.y > H - EDGE_ZONE)   this.vy -= EDGE_FORCE * (1 - (H - this.y) / EDGE_ZONE);

  // ———Turn smoothing (fish-like fluidity)———
  // Lerp post-rules velocity back toward pre-rules heading.
  // This resists sudden direction changes without adding any speed.
  if (cfg.turnDamp > 0 && spd0 > 0) {
    const spd1 = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd1 > 0) {
      const nx1 = this.vx / spd1, ny1 = this.vy / spd1;
      const blendNx = nx1 + (prevNx - nx1) * cfg.turnDamp;
      const blendNy = ny1 + (prevNy - ny1) * cfg.turnDamp;
      const len = Math.sqrt(blendNx * blendNx + blendNy * blendNy);
      if (len > 0) { this.vx = (blendNx / len) * spd1; this.vy = (blendNy / len) * spd1; }
    }
  }

  // ———Wander: per-boid random drift———
  // wanderAngle random-walks each frame; the resulting nudge gives individuals
  // occasional direction changes that override flock pressure briefly.
  // cfg.wander = 0 means none; insects use a high value for chaotic breakaways.
  if (cfg.wander > 0) {
    this.wanderAngle += (Math.random() - 0.5) * 0.6; // [NOTE] step size controls how fast direction changes
    this.vx += Math.cos(this.wanderAngle) * cfg.wander;
    this.vy += Math.sin(this.wanderAngle) * cfg.wander;
  }

  // Clamp speed using live cfg.speed
  const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  const target = cfg.speed;

  if (spd > 0) {
    // [FIX] smoothly push velocity toward target speed
    // Birds/insects (turnDamp=0) use faster convergence so they actually reach target speed
    const speedLerp = cfg.turnDamp > 0 ? 0.08 : 0.25;
    const desiredVx = (this.vx / spd) * target;
    const desiredVy = (this.vy / spd) * target;

    this.vx += (desiredVx - this.vx) * speedLerp;
    this.vy += (desiredVy - this.vy) * speedLerp;
  }

  // ———Store debug vectors for visualization———
  this.debug = {
    sepX, sepY,
    alignVX: alignCount > 0 ? (alignVX / alignCount) : 0,
    alignVY: alignCount > 0 ? (alignVY / alignCount) : 0,
    cohX: cohCount > 0 ? (cohX / cohCount) : this.x,
    cohY: cohCount > 0 ? (cohY / cohCount) : this.y
  };

  };

Boid.prototype.draw = function() {
  const angle = Math.atan2(this.vy, this.vx);
  const s     = cfg.boidSize;

  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(angle);
  ctx.globalAlpha = this.opacity * 0.45;

  ctx.beginPath();
  ctx.moveTo(s * 1.5,  0);
  ctx.lineTo(-s,        s * 0.75);
  ctx.lineTo(-s * 0.5,  0);
  ctx.lineTo(-s,       -s * 0.75);
  ctx.closePath();

  ctx.fillStyle = getComputedStyle(document.documentElement)
                    .getPropertyValue("--accent").trim();
  ctx.fill();







  if (followMode && this === followedBoid && this.debug) {

    ctx.globalAlpha = 1.0;

    // ———INNER SEP RADIUS (dashed red ring)———
    ctx.strokeStyle = "rgba(255, 80, 80, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, cfg.sepDist, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // FIX: must clear dash BEFORE drawing red lines below

    // ———VISION CIRCLE (solid yellow ring)———
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, cfg.visionDist, 0, Math.PI * 2);
    ctx.stroke();

    // ———SEPARATION LINES (RED — one per neighbor within sepDist)———
    console.log("=== SEP DEBUG ===");
    console.log("followedBoid position:", this.x, this.y);
    console.log("cfg.sepDist:", cfg.sepDist);
    console.log("total boids:", boids.length);
    console.log("current angle (rad):", angle);

    let neighborCount = 0;
    for (const other of boids) {
      if (other === this) continue;
      const dx   = other.x - this.x;
      const dy   = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      console.log("  neighbor dist:", dist.toFixed(1), "| within sepDist?", dist < cfg.sepDist);
      if (dist < cfg.sepDist) neighborCount++;
    }
    console.log("neighbors within sepDist:", neighborCount);

    // Now try the real sep lines also in world space
    for (const other of boids) {
      if (other === this) continue;
      const dx   = other.x - this.x;
      const dy   = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < cfg.sepDist && dist > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // world space
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
        ctx.restore();
      }
    }





    // ———ALIGNMENT LINE (CYAN)———
    if (this.debug.alignVX !== 0 || this.debug.alignVY !== 0) {
      const avx        = this.debug.alignVX;
      const avy        = this.debug.alignVY;
      const targetAngle = Math.atan2(avy, avx);
      const localAngle  = targetAngle - angle;
      const lineLen     = cfg.visionDist * 0.6;

      ctx.strokeStyle = "cyan";
      ctx.lineWidth   = 3;
      ctx.setLineDash([]); // safety clear
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(localAngle) * lineLen,
        Math.sin(localAngle) * lineLen
      );
      ctx.stroke();
    }

    // ———COHESION LINE (NEON GREEN)———
    const wcx  = this.debug.cohX - this.x;
    const wcy  = this.debug.cohY - this.y;
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    const lcx  = wcx * cosA - wcy * sinA;
    const lcy  = wcx * sinA + wcy * cosA;

    ctx.strokeStyle = "#39ff14";
    ctx.lineWidth   = 3;
    ctx.setLineDash([]); // safety clear
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lcx, lcy);
    ctx.stroke();
  }

  ctx.restore();
};

// ============================================================
const sections = document.querySelectorAll(".section");

sections.forEach(function(s) {
  s.style.opacity    = "0";
  s.style.transform  = "translateY(16px)";
  s.style.transition = "opacity 0.5s ease, transform 0.5s ease";
});

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.style.opacity   = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

sections.forEach(function(s) { observer.observe(s); });
