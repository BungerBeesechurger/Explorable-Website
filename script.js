// ———script.js———
// Two things happen here:
// 1. Boid simulation drawn on a background canvas (triangles that flock)
// 2. Scroll fade-in for page sections

// ============================================================
// ———Part 1: Boid Canvas Simulation———
// ============================================================

const canvas = document.getElementById("boid-canvas");
const ctx    = canvas.getContext("2d");

// ———Config———
const MAX_BOIDS    = 28;
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
  constructor() { this.spawn(); }

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

    const off =
      this.x < -MARGIN || this.x > window.innerWidth  + MARGIN ||
      this.y < -MARGIN || this.y > window.innerHeight + MARGIN;
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
const MOUSE_DIST  = 80;   // repulsion radius around cursor
const MOUSE_FORCE = 0.4;  // push strength

window.addEventListener("mousemove", function(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mouseleave", function() {
  mouse.x = -9999;
  mouse.y = -9999;
});

updateLanes();
const boids = [];
for (let i = 0; i < MAX_BOIDS; i++) boids.push(new Boid());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const b of boids) { b.applyRules(boids); b.update(); b.draw(); }
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
// ———Part 2: Boid Control Panel (Fig. 3)———
// Sliders directly mutate the live config variables used by
// applyRules() and draw() — no restart needed.
// ============================================================

// [NOTE] These mirror the const values declared above.
// We shadow them with let-bindings that the controls mutate.
let cfg = {
  sepForce:   0.60,
  alignForce: 0.06,
  cohForce:   0.001,
  sepDist:    32,
  visionDist: 95,
  boidSize:   12,  // bumped default so insects feel small by contrast
  speed:      2.4,
  count:      30,
  turnDamp:   0.0, // 0 = snappy, higher = smoother/more fluid turns
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
  // Fast, snappy direction changes, loose flock
  birds: {
    sepForce: 0.60, alignForce: 0.06, cohForce: 0.001,
    sepDist: 32, visionDist: 95, boidSize: 12, speed: 8.5, count: 30,
    turnDamp: 0.0  // zero momentum — turns are sudden and abrupt
  },

  // Fluid sweeping arcs, spread-out school (no collapse)
  fish: {
    sepForce: 0.55, alignForce: 0.15, cohForce: 0.004,
    sepDist: 30, visionDist: 140, boidSize: 11, speed: 6.0, count: 55,
    turnDamp: 0.60  // strong momentum carry — smooth sweeping turns
  },

  // Tiny, fast, barely social — scatters into small loose clusters
  insects: {
    sepForce: 0.15, alignForce: 0.005, cohForce: 0.001,
    sepDist: 12, visionDist: 30, boidSize: 3, speed: 5.5, count: 60,
    turnDamp: 0.0
  },

  // Slow pedestrian drift — wide personal space, loosely directional
  crowd: {
    sepForce: 0.36, alignForce: 0.130, cohForce: 0.005,
    sepDist: 45, visionDist: 60, boidSize: 13, speed: 1.6, count: 80,
    turnDamp: 0.30
  },

  // Swirling chaos — near-zero separation, strong cohesion, fast
  chaos: {
    sepForce: 0.04, alignForce: 0.00, cohForce: 0.018,
    sepDist: 8,  visionDist: 160, boidSize: 10, speed: 3.0, count: 60,
    turnDamp: 0.0
  }
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
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  cfg = { ...p };
  syncBoidCount();
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
    sepForce:   rnd(0.05, 0.50),
    alignForce: rnd(0.00, 0.12),
    cohForce:   rnd(0.001, 0.015),
    sepDist:    Math.round(rnd(8, 55)),
    visionDist: Math.round(rnd(30, 180) / 5) * 5,
    boidSize:   Math.round(rnd(3, 16)),
    speed:      rnd(0.4, 6.0),
    count:      Math.round(rnd(10, 70)),
    turnDamp:   rnd(0.0, 0.5),
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
      sepX -= dx / dist; sepY -= dy / dist; sepCount++;
    }
    if (dist < cfg.visionDist) {
      alignVX += other.vx; alignVY += other.vy; alignCount++;
      cohX += other.x; cohY += other.y; cohCount++;
    }
  }

  if (sepCount   > 0) {
    this.vx += (sepX / sepCount) * cfg.sepForce;
    this.vy += (sepY / sepCount) * cfg.sepForce;
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

  // Clamp speed using live cfg.speed
  const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  const target = cfg.speed;

  if (spd > 0) {
    // [FIX] smoothly push velocity toward target speed
    const desiredVx = (this.vx / spd) * target;
    const desiredVy = (this.vy / spd) * target;

    this.vx += (desiredVx - this.vx) * 0.08;
    this.vy += (desiredVy - this.vy) * 0.08;
  }
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
