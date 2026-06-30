'use client';

import { useEffect, useRef } from 'react';

export default function FirefliesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class for fireflies
    class Firefly {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      dx: number;
      dy: number;
      speed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.alpha = Math.random();
        this.dx = Math.random() * 100;
        this.dy = Math.random() * 100;
        this.speed = Math.random() * 0.02 + 0.005;
      }

      update() {
        // Subtle drift movement
        this.dx += this.speed;
        this.dy += this.speed;
        this.x += this.vx + Math.sin(this.dx) * 0.2;
        this.y += this.vy + Math.cos(this.dy) * 0.2;

        // Wrap around boundaries
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Pulse opacity
        this.alpha = 0.3 + Math.abs(Math.sin(this.dx)) * 0.7;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Soft yellow-green glow
        c.fillStyle = `rgba(180, 245, 120, ${this.alpha})`;
        c.shadowColor = 'rgba(180, 245, 120, 0.8)';
        c.shadowBlur = this.radius * 6;
        
        c.fill();
        c.restore();
      }
    }

    const firefliesCount = 60;
    const fireflies: Firefly[] = [];

    for (let i = 0; i < firefliesCount; i++) {
      fireflies.push(new Firefly());
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Render all fireflies
      fireflies.forEach(firefly => {
        firefly.update();
        firefly.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 hidden md:block"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
