import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

/* ================= CONFIG ================= */

const TEXT = "Akito祝您新春快乐";
const CHARACTERS = "0123456789ABCDEF<>{};()[]=+*-/_$@#%&";
const FONT_SIZE = 14;
const GRAVITY = 0.05;
const FRICTION = 0.96;
const COLORS = ["#ff0055", "#00ff99", "#00ccff", "#ffcc00", "#9900ff", "#ff5500"];

const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const randChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

/* ================= MATRIX RAIN ================= */

class MatrixDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  h: number;
  last: number;
  interval: number;

  constructor(x: number, h: number) {
    this.x = x;
    this.h = h;
    this.y = rand(-h, 0);
    this.speed = rand(2, 5);
    this.char = randChar();
    this.last = 0;
    this.interval = rand(50, 150);
  }

  update(t: number) {
    this.y += this.speed;
    if (t - this.last > this.interval) {
      this.char = randChar();
      this.last = t;
    }
    if (this.y > this.h) this.y = rand(-100, 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#00ff00";
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.globalAlpha = 0.3;
    ctx.fillText(this.char, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

/* ================= TEXT PARTICLE ================= */

class TextParticle {
  x: number;
  y: number;
  bx: number;
  by: number;
  density: number;
  char: string;

  constructor(x: number, y: number) {
    this.x = this.bx = x;
    this.y = this.by = y;
    this.density = rand(5, 25);
    this.char = randChar();
  }

  update(mx: number | null, my: number | null, shock: { x: number; y: number; r: number }[]) {
    if (mx !== null && my !== null) {
      const dx = this.x - mx;
      const dy = this.y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        const f = (120 - d) / 120;
        this.x += (dx / d) * f * this.density;
        this.y += (dy / d) * f * this.density;
      }
    }

    shock.forEach(s => {
      const dx = this.x - s.x;
      const dy = this.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < s.r) {
        const f = (s.r - d) / s.r;
        this.x += (dx / d) * f * 20;
        this.y += (dy / d) * f * 20;
      }
    });

    this.x += (this.bx - this.x) * 0.1;
    this.y += (this.by - this.y) * 0.1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#00ff00";
    ctx.font = "10px monospace";
    ctx.fillText(this.char, this.x, this.y);
  }
}

/* ================= EXPLOSION PARTICLE ================= */

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  color: string;
  char: string;

  constructor(x: number, y: number, c: string) {
    const ang = rand(0, Math.PI * 2);
    const sp = rand(3, 10);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(ang) * sp;
    this.vy = Math.sin(ang) * sp;
    this.a = 1;
    this.color = c;
    this.char = randChar();
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.a -= 0.015;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.max(0, this.a);
    ctx.fillStyle = this.color;
    ctx.font = "bold 14px monospace";
    ctx.fillText(this.char, this.x, this.y);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/* ================= ROCKET ================= */

class Rocket {
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  speed = 6;
  trail: { x: number; y: number }[] = [];
  done = false;

  constructor(sx: number, sy: number, tx: number, ty: number) {
    this.x = sx;
    this.y = sy;
    this.tx = tx;
    this.ty = ty;
    this.color = randColor();
  }

  update() {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < this.speed) {
      this.x = this.tx;
      this.y = this.ty;
      this.done = true;
      return;
    }
    const a = Math.atan2(dy, dx);
    this.x += Math.cos(a) * this.speed;
    this.y += Math.sin(a) * this.speed;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
}

/* ================= MAIN ================= */

const App = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let rockets: Rocket[] = [];
    let particles: Particle[] = [];
    let drops: MatrixDrop[] = [];
    let text: TextParticle[] = [];
    let shock: { x: number; y: number; r: number; life: number }[] = [];
    let mouse = { x: null as number | null, y: null as number | null };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      init();
    };

    const initText = () => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d")!;
      const isMobile = w < 768;
      const font = isMobile ? Math.min(w * 0.12, 48) : Math.min(w * 0.18, 140);

      o.font = `900 ${font}px Microsoft YaHei`;
      o.fillStyle = "#fff";
      o.textAlign = "center";
      o.textBaseline = "middle";

      const maxW = isMobile ? w * 0.9 : w;
      const chars = TEXT.split("");
      let line = "";
      let lines: string[] = [];

      chars.forEach(c => {
        if (o.measureText(line + c).width > maxW) {
          lines.push(line);
          line = c;
        } else line += c;
      });
      lines.push(line);

      const lh = font * 1.2;
      lines.forEach((l, i) => o.fillText(l, w / 2, h / 2 + (i - lines.length / 2) * lh));

      const img = o.getImageData(0, 0, w, h).data;
      text = [];
      const step = isMobile ? 8 : 6;
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step)
          if (img[(y * w + x) * 4 + 3] > 100) text.push(new TextParticle(x, y));
    };

    const init = () => {
      drops = [];
      for (let i = 0; i < w / FONT_SIZE; i++)
        for (let j = 0; j < 6; j++) drops.push(new MatrixDrop(i * FONT_SIZE, h));
      initText();
    };

    const explode = (x: number, y: number, c: string) => {
      for (let i = 0; i < 200; i++) particles.push(new Particle(x, y, c));
      shock.push({ x, y, r: 20, life: 20 });
    };

    const animate = () => {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, w, h);

      drops.forEach(d => {
        d.update(Date.now());
        d.draw(ctx);
      });

      shock.forEach(s => (s.r += 10, s.life--));
      shock = shock.filter(s => s.life > 0);

      text.forEach(t => {
        t.update(mouse.x, mouse.y, shock);
        t.draw(ctx);
      });

      rockets.forEach((r, i) => {
        r.update();
        r.draw(ctx);
        if (r.done) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      });

      particles.forEach(p => (p.update(), p.draw(ctx)));
      particles = particles.filter(p => p.a > 0);

      requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousedown", e => rockets.push(new Rocket(w / 2, h, e.clientX, e.clientY)));
    window.addEventListener("mousemove", e => ((mouse.x = e.clientX), (mouse.y = e.clientY)));
    window.addEventListener("touchstart", e => rockets.push(new Rocket(w / 2, h, e.touches[0].clientX, e.touches[0].clientY)));

    resize();
    animate();
  }, []);

  return <canvas ref={ref} style={{ width: "100vw", height: "100vh" }} />;
};

createRoot(document.getElementById("root")!).render(<App />);
