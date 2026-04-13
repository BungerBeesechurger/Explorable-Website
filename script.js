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

const SEPARATION_DIST   = 22;   // must stay at least this far apart (just over 2x boid size)
const SEPARATION_FORCE  = 0.18; // stronger push so they actually respect the distance
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

    // Nudge back toward lanes if drifting over content
    const inContent = this.x > leftLane.x + leftLane.width && this.x < rightLane.x;
    if (inContent) {
      const distLeft  = this.x - (leftLane.x + leftLane.width);
      const distRight = rightLane.x - this.x;
      this.vx += distLeft < distRight ? -0.05 : 0.05;
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
