import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants & Config ---
const CHARACTERS = "0123456789ABCDEF<>{};()[]=+*-/_$@#%&";
const FONT_SIZE = 14;
const GRAVITY = 0.05;
const FRICTION = 0.96;
const COLOR_PALETTE = [
  '#ff0055', // Neon Pink
  '#00ff99', // Cyber Green
  '#00ccff', // Electric Blue
  '#ffcc00', // Gold
  '#9900ff', // Purple
  '#ff5500', // Orange
];

// --- Helper Functions ---
const randomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomColor = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

// --- Classes ---

class MatrixDrop {
  x: number;
  y: number;
  speed: number;
  text: string;
  canvasHeight: number;
  lastUpdate: number;
  updateInterval: number;

  constructor(x: number, canvasHeight: number) {
    this.x = x;
    this.y = randomRange(-canvasHeight * 1.5, 0); 
    this.canvasHeight = canvasHeight;
    this.speed = randomRange(2, 5);
    this.text = randomChar();
    this.lastUpdate = 0;
    this.updateInterval = randomRange(50, 150);
  }

  update(time: number) {
    this.y += this.speed;
    
    if (time - this.lastUpdate > this.updateInterval) {
      this.text = randomChar();
      this.lastUpdate = time;
    }

    if (this.y > this.canvasHeight) {
      this.y = randomRange(-100, 0);
      this.speed = randomRange(2, 5);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0F0'; // Matrix Green
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.globalAlpha = 0.3; // Faint background
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1.0;
  }
}

class TextParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  density: number;
  color: string;
  char: string;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.size = 10; // Font size for particle
    this.density = (Math.random() * 30) + 1;
    this.color = '#00FF00'; // Green
    this.char = randomChar();
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Glitch effect: Occasional white flicker
    if (Math.random() > 0.95) {
        ctx.fillStyle = '#FFF';
    } else {
        ctx.fillStyle = this.color;
    }
    
    ctx.font = `${this.size}px monospace`;
    ctx.fillText(this.char, this.x, this.y);
  }

  update(mouseX: number | null, mouseY: number | null, explosions: {x: number, y: number, radius: number}[]) {
    let dx = 0;
    let dy = 0;
    let forceDirectionX = 0;
    let forceDirectionY = 0;
    let force = 0;

    // Interaction with Mouse
    if (mouseX !== null && mouseY !== null) {
        dx = mouseX - this.x;
        dy = mouseY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let maxDistance = 100;
        
        if (distance < maxDistance) {
            forceDirectionX = dx / distance;
            forceDirectionY = dy / distance;
            force = (maxDistance - distance) / maxDistance;
            let directionX = forceDirectionX * force * this.density;
            let directionY = forceDirectionY * force * this.density;
            this.x -= directionX;
            this.y -= directionY;
        }
    }

    // Interaction with Explosions (Shockwaves)
    explosions.forEach(exp => {
        const ex_dx = exp.x - this.x;
        const ex_dy = exp.y - this.y;
        const ex_dist = Math.sqrt(ex_dx*ex_dx + ex_dy*ex_dy);
        const shockRadius = exp.radius * 2; // Shockwave travels further than visual particles

        if (ex_dist < shockRadius) {
            const force = (shockRadius - ex_dist) / shockRadius;
            const angle = Math.atan2(ex_dy, ex_dx);
            this.x -= Math.cos(angle) * force * 15; // Strong push
            this.y -= Math.sin(angle) * force * 15;
        }
    });

    // Spring back to base
    if (this.x !== this.baseX) {
        let dx = this.x - this.baseX;
        this.x -= dx / 10;
    }
    if (this.y !== this.baseY) {
        let dy = this.y - this.baseY;
        this.y -= dy / 10;
    }
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  char: string;
  life: number;
  decay: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(3, 10);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.color = color;
    this.char = randomChar();
    this.life = 100;
    this.decay = randomRange(0.005, 0.015);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.font = `bold ${FONT_SIZE}px monospace`;
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}

class Rocket {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  trail: {x: number, y: number}[];
  exploded: boolean;

  constructor(startX: number, startY: number, targetX: number, targetY: number) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = 6;
    this.color = randomColor();
    this.trail = [];
    this.exploded = false;
  }

  update() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.speed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.exploded = true;
    } else {
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.trail.length > 0) {
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (const p of this.trail) {
        ctx.lineTo(p.x, p.y);
      }
    } else {
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + 2);
    }
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.fillRect(this.x - 1, this.y - 1, 3, 3);
    ctx.restore();
  }
}

// --- Main Component ---

const CodeFireworks = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // State
    let width = window.innerWidth;
    let height = window.innerHeight;
    let rockets: Rocket[] = [];
    let particles: Particle[] = [];
    let drops: MatrixDrop[] = [];
    let textParticles: TextParticle[] = [];
    let animationId: number;
    let lastAutoLaunch = 0;
    
    let mouse = { x: null as number | null, y: null as number | null };
    let explosions: {x: number, y: number, radius: number, life: number}[] = [];

    // Initialize Text Particles
    const initTextParticles = (w: number, h: number) => {
        textParticles = [];
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const oCtx = offscreen.getContext('2d');
        if (!oCtx) return;

        const fontSize = Math.max(10, w / 10); // Responsive font
        oCtx.font = `900 ${fontSize}px "Microsoft YaHei", sans-serif`;
        oCtx.fillStyle = 'white';
        oCtx.textAlign = 'center';
        oCtx.textBaseline = 'middle';
        oCtx.fillText("Akito祝您新春快乐", w / 2, h / 2);

        const imageData = oCtx.getImageData(0, 0, w, h);
        const data = imageData.data;
        
        const step = 6; // Sample every 6th pixel (increased for text chars)

        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                // Check alpha channel
                const index = (y * w + x) * 4;
                if (data[index + 3] > 128) {
                    textParticles.push(new TextParticle(x, y));
                }
            }
        }
    };

    // Initialization
    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Matrix Drops
      drops = [];
      const columns = Math.floor(width / FONT_SIZE);
      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < 6; j++) {
           drops.push(new MatrixDrop(i * FONT_SIZE, height));
        }
      }

      // Text Particles
      initTextParticles(width, height);
    };

    // Interaction
    const launchFirework = (targetX: number, targetY: number) => {
      const startX = width / 2 + randomRange(-width / 4, width / 4);
      rockets.push(new Rocket(startX, height, targetX, targetY));
    };

    const explode = (x: number, y: number, color: string) => {
      const particleCount = 200;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(x, y, color));
      }
      // Register shockwave
      explosions.push({x, y, radius: 10, life: 20});
    };

    const handleResize = () => {
      init();
    };

    const handleClick = (e: MouseEvent) => {
      launchFirework(e.clientX, e.clientY);
    };
    
    const handleTouch = (e: TouchEvent) => {
       e.preventDefault();
       const touch = e.touches[0];
       launchFirework(touch.clientX, touch.clientY);
       mouse.x = touch.clientX;
       mouse.y = touch.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    // Animation Loop
    const animate = (time: number) => {
      // Clear with trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Background Drops (Code Rain)
      drops.forEach(drop => {
        drop.update(time);
        drop.draw(ctx);
      });

      // 2. Process Explosions/Shockwaves for Interaction
      for(let i = explosions.length - 1; i >= 0; i--) {
          explosions[i].radius += 5; // Shockwave expands
          explosions[i].life--;
          if(explosions[i].life <= 0) explosions.splice(i, 1);
      }

      // 3. Draw Interactive Text Particles
      for (let i = 0; i < textParticles.length; i++) {
          textParticles[i].update(mouse.x, mouse.y, explosions);
          textParticles[i].draw(ctx);
      }

      // 4. Auto Launch Logic
      if (time - lastAutoLaunch > 1500 && Math.random() < 0.05) {
        const targetX = randomRange(width * 0.1, width * 0.9);
        const targetY = randomRange(height * 0.1, height * 0.5);
        launchFirework(targetX, targetY);
        lastAutoLaunch = time;
      }

      // 5. Update & Draw Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        rocket.update();
        rocket.draw(ctx);

        if (rocket.exploded) {
          explode(rocket.x, rocket.y, rocket.color);
          rockets.splice(i, 1);
        }
      }

      // 6. Update & Draw Explosion Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Event Listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('touchmove', handleTouch, { passive: false });

    // Start
    init();
    animate(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<CodeFireworks />);
