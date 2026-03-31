import { useRef, useEffect } from 'react';

const FPS_INTERVAL = 250; // 4fps

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function CameraFeed({ robot }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId;
    let lastDraw = 0;

    function drawStaticFrame() {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0, 255, 65, 0.06)';
      ctx.fillRect(0, 0, w, h);

      // Scan lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      // Crosshair
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Heading
      const heading = robot.heading ?? 0;
      const lineLen = Math.min(w, h) * 0.3;
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(heading) * lineLen, cy - Math.cos(heading) * lineLen);
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#00ff41';
      ctx.font = '11px JetBrains Mono';
      ctx.textBaseline = 'top';
      ctx.fillText(`CAM-${robot.id}`, 8, 8);
      ctx.globalAlpha = 1;
      ctx.font = '700 11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', w - 8, 8);
      ctx.textAlign = 'left';
      ctx.font = '12px JetBrains Mono';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatTimestamp(new Date()), 8, h - 8);
      ctx.textBaseline = 'top';
    }

    if (prefersReducedMotion) {
      drawStaticFrame();
      return;
    }

    function draw(timestamp) {
      animId = requestAnimationFrame(draw);

      if (timestamp - lastDraw < FPS_INTERVAL) return;
      lastDraw = timestamp;

      const w = canvas.width;
      const h = canvas.height;

      // a. Dark background
      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(0, 0, w, h);

      // b. Night-vision overlay
      ctx.fillStyle = 'rgba(0, 255, 65, 0.06)';
      ctx.fillRect(0, 0, w, h);

      // c. Random noise (~2% pixel density, random rects)
      ctx.fillStyle = 'rgba(0, 255, 65, 0.08)';
      const noiseCount = Math.floor((w * h) * 0.02 / 4);
      for (let i = 0; i < noiseCount; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        ctx.fillRect(nx, ny, 2, 2);
      }

      // d. Horizontal scan lines every 3px
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      // e. Center crosshair
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // f. Heading compass indicator
      const heading = robot.heading ?? 0;
      const lineLen = Math.min(w, h) * 0.3;
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.sin(heading) * lineLen,
        cy - Math.cos(heading) * lineLen
      );
      ctx.stroke();

      // g. CAM label top-left
      ctx.fillStyle = '#00ff41';
      ctx.font = '11px JetBrains Mono';
      ctx.textBaseline = 'top';
      ctx.fillText(`CAM-${robot.id}`, 8, 8);

      // h. LIVE badge top-right, pulsing opacity
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 500);
      ctx.globalAlpha = pulse;
      ctx.font = '700 11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', w - 8, 8);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';

      // i. Timestamp bottom-left
      ctx.font = '12px JetBrains Mono';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatTimestamp(new Date()), 8, h - 8);
      ctx.textBaseline = 'top';
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [robot.id, robot.heading]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={240}
      className="border border-border block w-full"
    />
  );
}
