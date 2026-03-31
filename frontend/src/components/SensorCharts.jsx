import { useRef, useEffect } from 'react';

/* ── Battery Gauge (Canvas) ─────────────────────────────── */
function BatteryGauge({ level }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, w, h);

    // Battery outline
    const bx = 16, by = 12, bw = w - 32, bh = h - 32;
    ctx.strokeStyle = '#3a4050';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Battery cap (top)
    const capW = 16, capH = 5;
    ctx.fillStyle = '#3a4050';
    ctx.fillRect(bx + (bw - capW) / 2, by - capH, capW, capH);

    // Fill level
    const pct = Math.max(0, Math.min(100, level)) / 100;
    const fillH = Math.round(bh * pct);
    const fillY = by + bh - fillH;

    let fillColor;
    if (level <= 10) fillColor = '#e53e3e';
    else if (level <= 20) fillColor = '#f0b429';
    else if (level <= 50) fillColor = '#60a5fa';
    else fillColor = '#44c553';

    ctx.fillStyle = fillColor;
    ctx.fillRect(bx + 2, fillY, bw - 4, fillH);

    // Segment lines (every 25%)
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const sy = by + bh * (i / 4);
      ctx.beginPath();
      ctx.moveTo(bx + 2, sy);
      ctx.lineTo(bx + bw - 2, sy);
      ctx.stroke();
    }

    // Percentage text
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6e8eb';
    ctx.fillText(`${Math.round(level)}%`, w / 2, h / 2);
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={110}
      style={{ width: 80, height: 110 }}
      role="img"
      aria-label={`Battery: ${Math.round(level)}%`}
    />
  );
}

/* ── Speed Dial (Canvas) ────────────────────────────────── */
function SpeedDial({ speed }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = 38;

    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#1a1f2e';
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Gauge arc from 225° to -45° (270° sweep)
    const startAngle = (225 * Math.PI) / 180;
    const sweep = (270 * Math.PI) / 180;
    const maxSpeed = 20;
    const ticks = 10;

    // Ticks
    for (let i = 0; i <= ticks; i++) {
      const frac = i / ticks;
      const angle = startAngle - frac * sweep;
      const isMajor = i % 2 === 0;
      const innerR = isMajor ? radius - 10 : radius - 6;

      ctx.strokeStyle = isMajor ? '#60a5fa' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(angle) * innerR, center - Math.sin(angle) * innerR);
      ctx.lineTo(center + Math.cos(angle) * (radius - 2), center - Math.sin(angle) * (radius - 2));
      ctx.stroke();

      if (isMajor) {
        const labelR = radius - 18;
        const tickVal = (maxSpeed * frac).toFixed(0);
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tickVal, center + Math.cos(angle) * labelR, center - Math.sin(angle) * labelR);
      }
    }

    // Needle
    const clamped = Math.max(0, Math.min(maxSpeed, speed || 0));
    const frac = clamped / maxSpeed;
    const needleAngle = startAngle - frac * sweep;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-needleAngle + Math.PI / 2);
    ctx.strokeStyle = '#e6e8eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, -(radius - 14));
    ctx.stroke();
    ctx.fillStyle = '#e6e8eb';
    ctx.beginPath();
    ctx.moveTo(0, -(radius - 14));
    ctx.lineTo(-2, -(radius - 20));
    ctx.lineTo(2, -(radius - 20));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#2a3040';
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();

    // Digital readout
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6e8eb';
    ctx.fillText(`${(speed || 0).toFixed(1)}`, center, center + 18);

    // Unit label
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('km/h', center, center + 28);
  }, [speed]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={96}
        height={100}
        style={{ width: 96, height: 100 }}
        role="img"
        aria-label={`Speed: ${(speed || 0).toFixed(1)} km/h`}
      />
      <span className="sr-only" aria-live="polite">{`Speed: ${(speed || 0).toFixed(1)} km/h`}</span>
    </>
  );
}

/* ── Mini Compass (Canvas) ──────────────────────────────── */
function MiniCompass({ headingRad }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = 38;

    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#1a1f2e';
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = '#f0b429';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    const headingDeg = (headingRad || 0) * (180 / Math.PI);

    // Ticks
    ctx.save();
    ctx.translate(center, center);
    for (let deg = 0; deg < 360; deg += 30) {
      const angle = ((deg - headingDeg) * Math.PI) / 180 - Math.PI / 2;
      const isMajor = deg % 90 === 0;
      const innerR = isMajor ? radius - 10 : radius - 6;

      ctx.strokeStyle = isMajor ? '#f0b429' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * (radius - 2), Math.sin(angle) * (radius - 2));
      ctx.stroke();
    }

    // Cardinals
    const cardinals = ['N', 'E', 'S', 'W'];
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const deg = i * 90;
      const angle = ((deg - headingDeg) * Math.PI) / 180 - Math.PI / 2;
      const lr = radius - 18;
      ctx.fillStyle = cardinals[i] === 'N' ? '#f0b429' : '#e6e8eb';
      ctx.fillText(cardinals[i], Math.cos(angle) * lr, Math.sin(angle) * lr);
    }
    ctx.restore();

    // Heading pointer
    ctx.fillStyle = '#f0b429';
    ctx.beginPath();
    ctx.moveTo(center, center - radius + 1);
    ctx.lineTo(center - 4, center - radius - 6);
    ctx.lineTo(center + 4, center - radius - 6);
    ctx.closePath();
    ctx.fill();

    // Digital readout
    const degDisplay = ((headingDeg % 360) + 360) % 360;
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6e8eb';
    ctx.fillText(`${Math.round(degDisplay)}°`, center, center);
  }, [headingRad]);

  const degDisplay = Math.round((((headingRad || 0) * (180 / Math.PI)) % 360 + 360) % 360);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={96}
        height={100}
        style={{ width: 96, height: 100 }}
        role="img"
        aria-label={`Heading: ${degDisplay} degrees`}
      />
      <span className="sr-only" aria-live="polite">{`Heading: ${degDisplay} degrees`}</span>
    </>
  );
}

/* ── Main Component — Ground Robot Instruments ──────────── */
export default function SensorCharts({ robot }) {
  return (
    <div className="flex flex-col gap-sm items-center">
      {/* Top row: Battery + Speed + Compass */}
      <div className="flex gap-sm justify-center items-end">
        <div className="flex flex-col items-center">
          <BatteryGauge level={robot?.battery ?? 0} />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">BATTERY</span>
        </div>
        <div className="flex flex-col items-center">
          <SpeedDial speed={robot?.speed ?? 0} />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">SPEED</span>
        </div>
        <div className="flex flex-col items-center">
          <MiniCompass headingRad={robot?.heading ?? 0} />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">HEADING</span>
        </div>
      </div>
    </div>
  );
}

export { BatteryGauge };
