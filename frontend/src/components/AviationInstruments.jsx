import { useRef, useEffect } from 'react';
import { BatteryGauge } from './SensorCharts';

const SIZE = 110;
const CENTER = SIZE / 2;
const RADIUS = 44;

/**
 * Shared gauge drawing helper.
 * Draws: outer ring, tick marks, needle at angle, center digital readout.
 */
function drawGauge(ctx, opts) {
  const {
    value,
    min = 0,
    max = 360,
    label,
    unit = '',
    ringColor,
    needleColor = '#e6e8eb',
    ticks = 12,
    isCompass = false,
  } = opts;

  const bg = '#1a1f2e';

  // Clear and fill background
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS + 6, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS - 12, 0, Math.PI * 2);
  ctx.stroke();

  if (isCompass) {
    drawCompass(ctx, value, ringColor);
  } else {
    drawNeedleGauge(ctx, value, min, max, ticks, ringColor, needleColor, unit);
  }
}

function drawCompass(ctx, headingRad, ringColor) {
  const headingDeg = (headingRad || 0) * (180 / Math.PI);
  const cardinals = ['N', 'E', 'S', 'W'];
  const majorAngles = [0, 90, 180, 270];

  // Rotate so current heading is at top
  ctx.save();
  ctx.translate(CENTER, CENTER);

  // Draw tick marks (every 30 degrees)
  for (let deg = 0; deg < 360; deg += 10) {
    const angle = ((deg - headingDeg) * Math.PI) / 180 - Math.PI / 2;
    const isMajor = deg % 30 === 0;
    const innerR = isMajor ? RADIUS - 14 : RADIUS - 8;

    ctx.strokeStyle = isMajor ? ringColor : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * (RADIUS - 3), Math.sin(angle) * (RADIUS - 3));
    ctx.stroke();
  }

  // Cardinal labels
  ctx.font = 'bold 10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 4; i++) {
    const deg = majorAngles[i];
    const angle = ((deg - headingDeg) * Math.PI) / 180 - Math.PI / 2;
    const labelR = RADIUS - 24;
    const x = Math.cos(angle) * labelR;
    const y = Math.sin(angle) * labelR;

    ctx.fillStyle = cardinals[i] === 'N' ? '#f0b429' : '#e6e8eb';
    ctx.fillText(cardinals[i], x, y);
  }

  // Heading pointer (top triangle)
  ctx.restore();
  ctx.fillStyle = '#f0b429';
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER - RADIUS + 1);
  ctx.lineTo(CENTER - 5, CENTER - RADIUS - 8);
  ctx.lineTo(CENTER + 5, CENTER - RADIUS - 8);
  ctx.closePath();
  ctx.fill();

  // Center digital readout
  const degDisplay = ((headingDeg % 360) + 360) % 360;
  ctx.font = 'bold 13px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e6e8eb';
  ctx.fillText(`${Math.round(degDisplay)}°`, CENTER, CENTER);
}

function drawNeedleGauge(ctx, value, min, max, ticks, ringColor, needleColor, unit) {
  // Gauge arc from 225 deg (bottom-left) to -45 deg (bottom-right), sweeping 270 deg
  const startAngle = (225 * Math.PI) / 180;
  const sweep = (270 * Math.PI) / 180;

  // Tick marks
  for (let i = 0; i <= ticks; i++) {
    const frac = i / ticks;
    const angle = startAngle - frac * sweep;
    const isMajor = i % (ticks / 4) === 0 || i === 0 || i === ticks;
    const innerR = isMajor ? RADIUS - 14 : RADIUS - 8;

    ctx.strokeStyle = isMajor ? ringColor : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(CENTER + Math.cos(angle) * innerR, CENTER - Math.sin(angle) * innerR);
    ctx.lineTo(CENTER + Math.cos(angle) * (RADIUS - 3), CENTER - Math.sin(angle) * (RADIUS - 3));
    ctx.stroke();

    // Label major ticks
    if (isMajor) {
      const labelR = RADIUS - 22;
      const tickVal = min + (max - min) * frac;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        Math.round(tickVal).toString(),
        CENTER + Math.cos(angle) * labelR,
        CENTER - Math.sin(angle) * labelR
      );
    }
  }

  // Needle
  const clamped = Math.max(min, Math.min(max, value));
  const frac = (clamped - min) / (max - min);
  const needleAngle = startAngle - frac * sweep;

  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(-needleAngle + Math.PI / 2);

  // Needle line
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -(RADIUS - 16));
  ctx.stroke();

  // Needle tip
  ctx.fillStyle = needleColor;
  ctx.beginPath();
  ctx.moveTo(0, -(RADIUS - 16));
  ctx.lineTo(-3, -(RADIUS - 24));
  ctx.lineTo(3, -(RADIUS - 24));
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Center hub
  ctx.fillStyle = '#2a3040';
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Digital readout
  const displayVal = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  ctx.font = 'bold 13px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e6e8eb';
  ctx.fillText(`${displayVal}${unit}`, CENTER, CENTER + 22);
}

function Gauge({ robot, type }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (type === 'heading') {
      drawGauge(ctx, {
        value: robot.heading || 0,
        ringColor: '#60a5fa',
        isCompass: true,
      });
    } else if (type === 'altitude') {
      const alt = robot.altitude ?? 0;
      drawGauge(ctx, {
        value: alt,
        min: 0,
        max: 100,
        ringColor: '#44c553',
        unit: 'm',
        ticks: 10,
      });
    } else if (type === 'airspeed') {
      drawGauge(ctx, {
        value: robot.speed || 0,
        min: 0,
        max: 30,
        ringColor: '#60a5fa',
        unit: '',
        ticks: 6,
      });
    }
  }, [robot.heading, robot.speed, robot.status, robot.altitude, type]);

  const headingDeg = Math.round((((robot.heading || 0) * (180 / Math.PI)) % 360 + 360) % 360);
  const ariaLabels = {
    heading: `Heading: ${headingDeg} degrees`,
    altitude: `Altitude: ${robot.altitude ?? 0} meters`,
    airspeed: `Airspeed: ${(robot.speed || 0).toFixed(1)}`,
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{ width: SIZE, height: SIZE }}
        role="img"
        aria-label={ariaLabels[type]}
      />
      <span className="sr-only" aria-live="polite">{ariaLabels[type]}</span>
    </>
  );
}

export default function AviationInstruments({ robot }) {
  return (
    <div className="flex flex-col gap-sm items-center">
      {/* Row 1: Battery + Heading */}
      <div className="flex gap-sm justify-center items-end">
        <div className="flex flex-col items-center">
          <BatteryGauge level={robot?.battery ?? 0} />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">BATTERY</span>
        </div>
        <div className="flex flex-col items-center">
          <Gauge robot={robot} type="heading" />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">HEADING</span>
        </div>
      </div>
      {/* Row 2: Altitude + Airspeed */}
      <div className="flex gap-sm justify-center items-end">
        <div className="flex flex-col items-center">
          <Gauge robot={robot} type="altitude" />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">ALTITUDE</span>
        </div>
        <div className="flex flex-col items-center">
          <Gauge robot={robot} type="airspeed" />
          <span className="font-mono text-[9px] text-text-muted uppercase mt-xs">AIRSPEED</span>
        </div>
      </div>
    </div>
  );
}
