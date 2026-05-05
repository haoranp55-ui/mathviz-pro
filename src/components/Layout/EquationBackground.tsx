// src/components/Layout/EquationBackground.tsx
import React, { useRef, useEffect } from 'react';

const MATH_SYMBOLS = ['Σ', '∫', '∂', '√', 'π', '∞', '≈', '±', '÷', '×', '∑', '∏', '∆', '∇', '∃', '∀', '∈', '∉', '∩', '∪', '⊂', '⊃', '≤', '≥', '≠', 'α', 'β', 'γ', 'δ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω', 'ƒ', 'ξ', 'ρ', '∮', '∯', '∰', '∴', '∵', '∼', '≡', '≅', '∝', '∟', '∠', '∡', '∢', '⊥', '∥', '∦', '∴', '∵'];

const EQUATION_FRAGMENTS = ['x²+y²', 'e^iπ', 'a²+b²', 'sin θ', 'cos ω', '∫f(x)', 'dx/dt', 'lim', '∂z/∂x', '∇·F', 'det A', 'Tr M', 'λI-A', 'Σaᵢ', 'Πbⱼ', 'n!', 'Γ(z)', 'ζ(s)'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: 'dot' | 'symbol' | 'fragment';
  content: string;
  rotation: number;
  rotationSpeed: number;
  pulsePhase: number;
}

function createParticle(w: number, h: number): Particle {
  const typeRoll = Math.random();
  let type: Particle['type'];
  let content = '';
  let size = 0;

  if (typeRoll < 0.5) {
    type = 'dot';
    size = 1.5 + Math.random() * 2.5;
  } else if (typeRoll < 0.85) {
    type = 'symbol';
    content = MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
    size = 10 + Math.random() * 16;
  } else {
    type = 'fragment';
    content = EQUATION_FRAGMENTS[Math.floor(Math.random() * EQUATION_FRAGMENTS.length)];
    size = 11 + Math.random() * 9;
  }

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    size,
    opacity: 0.04 + Math.random() * 0.1,
    type,
    content,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.003,
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

function drawCurve(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  // 绘制几条极淡的函数曲线轮廓
  const curves = [
    (x: number) => Math.sin(x * 0.01 + time * 0.0003) * 60,
    (x: number) => Math.cos(x * 0.008 + time * 0.0002) * 50,
    (x: number) => Math.sin(x * 0.015 + time * 0.0004) * Math.cos(x * 0.005) * 40,
  ];

  curves.forEach((fn, idx) => {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(14, 165, 233, ${0.015 + idx * 0.005})`;
    ctx.lineWidth = 1;

    const yOffset = h * (0.25 + idx * 0.25);
    for (let x = 0; x < w; x += 3) {
      const y = yOffset + fn(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.015)';
  ctx.lineWidth = 0.5;

  const spacing = 80;
  ctx.beginPath();
  for (let x = 0; x < w; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export const EquationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // 重新初始化粒子数量
      const area = canvas.width * canvas.height;
      const targetCount = Math.floor(area / 18000);
      const current = particlesRef.current;
      if (current.length < targetCount) {
        for (let i = current.length; i < targetCount; i++) {
          current.push(createParticle(canvas.width, canvas.height));
        }
      } else if (current.length > targetCount) {
        particlesRef.current = current.slice(0, targetCount);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      time++;

      // 底层网格
      drawGrid(ctx, w, h);

      // 函数曲线
      drawCurve(ctx, w, h, time);

      const particles = particlesRef.current;

      // 更新位置
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.pulsePhase += 0.01;

        // 边缘循环
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;
      });

      // 绘制连线
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.04;
            ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 绘制粒子
      particles.forEach(p => {
        const pulse = 1 + Math.sin(p.pulsePhase) * 0.15;
        const currentOpacity = p.opacity * pulse;

        if (p.type === 'dot') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(14, 165, 233, ${currentOpacity})`;
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.font = `${p.type === 'fragment' ? 'italic ' : ''}${Math.round(p.size * pulse)}px "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace`;
          ctx.fillStyle = `rgba(14, 165, 233, ${currentOpacity})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.content, 0, 0);
          ctx.restore();
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};
