'use client';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export function fireParticleConfetti(x: number, y: number, baseColor: string) {
  if (typeof window === 'undefined') return;

  // Crear canvas dinámico
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  // Ajustar dimensiones
  const resizeCanvas = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resizeCanvas();

  const particles: Particle[] = [];
  const particleCount = 45;

  // Variaciones de color basadas en el color base
  const colors = [
    baseColor,
    baseColor + 'dd', // Ligeramente transparente
    baseColor + '99', // Más transparente
    '#ffffff', // Destello blanco
    '#fbbf24', // Oro para el toque luxury
  ];

  // Inicializar partículas
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
      vy: Math.sin(angle) * speed - (1 + Math.random() * 4), // Empuje hacia arriba
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02,
    });
  }

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach((p) => {
      if (p.alpha <= 0) return;

      activeParticles++;

      // Aplicar física
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16; // Gravedad suave
      p.vx *= 0.98; // Resistencia del aire
      p.vy *= 0.98;
      p.alpha -= p.decay;

      // Dibujar partícula (círculos suaves y diamantes)
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      
      // Dibujar un destello en forma de estrella de 4 puntas o círculo
      if (Math.random() > 0.5) {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      } else {
        // Diamante luxury
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size, p.y);
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    if (activeParticles > 0) {
      requestAnimationFrame(animate);
    } else {
      // Destruir canvas cuando termine la animación
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
