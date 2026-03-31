import { useRef, useEffect } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Text } from 'ol/style';
import RegularShape from 'ol/style/RegularShape';
import GeoJSON from 'ol/format/GeoJSON';
import { sector } from '@turf/sector';
import 'ol/ol.css';

const geojsonFormat = new GeoJSON();

function createFovFeature(robot) {
  const center = [robot.longitude, robot.latitude]; // EPSG:4326
  const headingDeg = (robot.heading ?? 0) * (180 / Math.PI); // radians to degrees
  const isGround = (robot.robotType || 'ground') === 'ground';

  const spread = isGround ? 30 : 120;      // degrees
  const range = isGround ? 0.08 : 0.04;    // km (80m / 40m)

  const bearing1 = headingDeg - spread / 2;
  const bearing2 = headingDeg + spread / 2;

  const sectorGeoJSON = sector(center, range, bearing1, bearing2, {
    units: 'kilometers',
    steps: 32,
  });

  const feature = geojsonFormat.readFeature(sectorGeoJSON, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });

  feature.setId('fov-' + robot.id);
  return feature;
}

function fovStyle(robotType) {
  const isGround = (robotType || 'ground') === 'ground';
  const color = isGround ? '68, 197, 83' : '96, 165, 250';
  return new Style({
    fill: new Fill({ color: `rgba(${color}, 0.15)` }),
    stroke: new Stroke({ color: `rgba(${color}, 0.3)`, width: 1 }),
  });
}

const TYPE_COLORS = {
  ground: { moving: '#44c553', idle: '#6b7280' },
  air:    { moving: '#60a5fa', idle: '#6b7280' },
};

const STATUS_COLORS = {
  charging: '#60a5fa',
  dead: '#e53e3e',
  returning: null, // use type color (same as moving)
};

const TYPE_TRAIL_COLORS = {
  ground: { moving: 'rgba(68, 197, 83, 0.4)', idle: 'rgba(107, 114, 128, 0.4)' },
  air:    { moving: 'rgba(96, 165, 250, 0.4)', idle: 'rgba(107, 114, 128, 0.4)' },
};

// Geofence coordinates (EPSG:4326) — Muehlweg 44 business park boundary
const GEOFENCE_COORDS = [
  [12.4165, 51.3782],
  [12.4165, 51.3807],
  [12.4210, 51.3807],
  [12.4210, 51.3782],
  [12.4165, 51.3782], // close the ring
];

function robotStyle(robotType, status, isSelected, heading) {
  const type = robotType || 'ground';
  const colors = TYPE_COLORS[type] || TYPE_COLORS.ground;
  const statusOverride = STATUS_COLORS[status];
  const color = statusOverride || (colors[status] || colors.moving || colors.idle);
  const radius = isSelected ? 14 : 10;
  const isAir = type === 'air';

  const isCharging = status === 'charging';
  const strokeColor = isSelected ? '#f0b429' : isCharging ? '#93c5fd' : color;
  const strokeWidth = isSelected ? 3 : isCharging ? 3 : 2;

  const styles = [];

  if (isAir) {
    // Air robots: drop shadow to suggest altitude
    styles.push(
      new Style({
        image: new RegularShape({
          points: 3,
          radius: radius + 2,
          angle: 0,
          displacement: [3, -3],
          fill: new Fill({ color: 'rgba(0, 0, 0, 0.3)' }),
          stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.15)', width: 1 }),
        }),
      })
    );
    // Air marker: upward triangle (drone silhouette)
    styles.push(
      new Style({
        image: new RegularShape({
          points: 3,
          radius,
          angle: 0,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        }),
      })
    );
  } else {
    // Ground robots: square marker
    styles.push(
      new Style({
        image: new RegularShape({
          points: 4,
          radius,
          angle: Math.PI / 4,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        }),
      })
    );
  }

  // Direction arrow — triangle orbiting marker in heading direction
  if (heading != null) {
    const arrowDist = radius + 8;
    // Compute displacement: heading is clockwise from north (radians)
    // OL displacement: [+X = right, +Y = up]
    const dx = Math.sin(heading) * arrowDist;
    const dy = Math.cos(heading) * arrowDist;

    styles.push(
      new Style({
        image: new RegularShape({
          points: 3,
          radius: 6,
          rotation: heading,
          displacement: [dx, dy],
          fill: new Fill({ color }),
          stroke: new Stroke({ color, width: 1 }),
        }),
      })
    );
  }

  // Air altitude label
  if (isAir && status !== 'dead') {
    const alt = status === 'charging' ? 0 : 35 + Math.round(Math.abs(Math.sin(heading || 0)) * 15);
    styles.push(
      new Style({
        text: new Text({
          text: `${alt}m`,
          font: 'bold 10px JetBrains Mono, monospace',
          offsetY: radius + 14,
          fill: new Fill({ color: '#93c5fd' }),
          stroke: new Stroke({ color: '#141820', width: 3 }),
        }),
      })
    );
  }

  return styles;
}

function stationStyle(occupied, capacity) {
  const isFull = occupied >= capacity;
  const color = isFull ? '#f0b429' : '#44c553'; // amber when full, green when available

  return [
    // Diamond marker with dashed stroke
    new Style({
      image: new RegularShape({
        points: 4,
        radius: 14,
        angle: 0,
        fill: new Fill({ color: color + '33' }),
        stroke: new Stroke({ color, width: 3, lineDash: [4, 4] }),
      }),
    }),
    // Lightning bolt unicode
    new Style({
      text: new Text({
        text: '\u26A1',
        font: '16px sans-serif',
        fill: new Fill({ color }),
      }),
    }),
    // Occupancy badge above marker
    new Style({
      text: new Text({
        text: `${occupied}/${capacity}`,
        font: 'bold 11px JetBrains Mono, monospace',
        offsetY: -22,
        fill: new Fill({ color: '#e6e8eb' }),
        stroke: new Stroke({ color: '#141820', width: 3 }),
        backgroundFill: new Fill({ color: 'rgba(20, 24, 32, 0.85)' }),
        padding: [2, 4, 2, 4],
      }),
    }),
  ];
}

export default function MapContainer({ robots, stations, selectedRobotId, onRobotClick, onDeselect, trailHistoryRef, pathHistoryPositions }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const vectorSource = useRef(new VectorSource());
  const trailSource = useRef(new VectorSource());
  const stationSource = useRef(new VectorSource());
  const fovSource = useRef(new VectorSource());
  const pathHistorySource = useRef(new VectorSource());
  const prevCoordsRef = useRef({});
  const prevSelectedRef = useRef(null);
  const animationFrameRef = useRef({});

  // Initialize map once
  useEffect(() => {
    // Geofence layer
    const geofenceCoords = GEOFENCE_COORDS.map((c) => fromLonLat(c));
    const geofenceFeature = new Feature({
      geometry: new Polygon([geofenceCoords]),
    });
    geofenceFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: '#f0b42966',
          width: 2,
          lineDash: [10, 6],
        }),
      })
    );
    const geofenceSource = new VectorSource({ features: [geofenceFeature] });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: geofenceSource, zIndex: 0 }),
        new VectorLayer({ source: stationSource.current, zIndex: 1 }),
        new VectorLayer({ source: fovSource.current, zIndex: 2 }),
        new VectorLayer({ source: pathHistorySource.current, zIndex: 3 }),
        new VectorLayer({ source: trailSource.current, zIndex: 4 }),
        new VectorLayer({ source: vectorSource.current, zIndex: 5 }),
      ],
      view: new View({
        center: fromLonLat([12.4185, 51.3795]),
        zoom: 17,
      }),
    });

    mapInstance.current = map;

    map.on('click', (evt) => {
      let featureClicked = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const robotId = feature.get('robotId');
        if (robotId && onRobotClick) {
          onRobotClick(robotId);
          featureClicked = true;
        }
      });
      if (!featureClicked && onDeselect) {
        onDeselect();
      }
    });

    return () => {
      // Cancel all pending animations
      const frames = animationFrameRef.current;
      for (const id of Object.keys(frames)) {
        cancelAnimationFrame(frames[id]);
      }
      animationFrameRef.current = {};
      map.setTarget(undefined);
      mapInstance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update robot features imperatively
  useEffect(() => {
    if (!robots || robots.length === 0) return;

    const currentIds = new Set();

    for (const robot of robots) {
      currentIds.add(robot.id);
      const newCoords = fromLonLat([robot.longitude, robot.latitude]);
      const existing = vectorSource.current.getFeatureById(robot.id);
      const robotType = robot.robotType || robot.type || 'ground';
      const heading = robot.heading != null ? robot.heading : null;

      if (existing) {
        // Animate from old position to new position
        const oldCoords = prevCoordsRef.current[robot.id] || existing.getGeometry().getCoordinates();

        // Check if position actually changed
        if (oldCoords[0] !== newCoords[0] || oldCoords[1] !== newCoords[1]) {
          // Cancel any existing animation for this robot
          if (animationFrameRef.current[robot.id]) {
            cancelAnimationFrame(animationFrameRef.current[robot.id]);
          }

          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const endCoords = [...newCoords];

          if (prefersReducedMotion) {
            // Instant teleport — skip interpolation
            existing.getGeometry().setCoordinates(endCoords);
            prevCoordsRef.current[robot.id] = endCoords;
          } else {
            const startTime = performance.now();
            const duration = 1800;
            const startCoords = [...oldCoords];

            function animate(now) {
              let t = Math.min((now - startTime) / duration, 1);
              // Ease-in-out cubic for smooth continuous motion
              t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

              const x = startCoords[0] + (endCoords[0] - startCoords[0]) * t;
              const y = startCoords[1] + (endCoords[1] - startCoords[1]) * t;
              existing.getGeometry().setCoordinates([x, y]);

              if (t < 1) {
                animationFrameRef.current[robot.id] = requestAnimationFrame(animate);
              } else {
                prevCoordsRef.current[robot.id] = endCoords;
                delete animationFrameRef.current[robot.id];
              }
            }

            animationFrameRef.current[robot.id] = requestAnimationFrame(animate);
          }
        }

        existing.set('status', robot.status);
        existing.set('robotType', robotType);
        existing.setStyle(robotStyle(robotType, robot.status, robot.id === selectedRobotId, heading));
      } else {
        // New feature — place directly
        const feature = new Feature({
          geometry: new Point(newCoords),
          robotId: robot.id,
          status: robot.status,
          robotType,
        });
        feature.setId(robot.id);
        feature.set('robotType', robotType);
        feature.setStyle(robotStyle(robotType, robot.status, robot.id === selectedRobotId, heading));
        vectorSource.current.addFeature(feature);
        prevCoordsRef.current[robot.id] = [...newCoords];
      }
    }

    // Remove features for robots no longer in the array
    for (const feature of vectorSource.current.getFeatures()) {
      const fid = feature.get('robotId');
      if (fid && !currentIds.has(fid)) {
        vectorSource.current.removeFeature(feature);
        delete prevCoordsRef.current[fid];
        if (animationFrameRef.current[fid]) {
          cancelAnimationFrame(animationFrameRef.current[fid]);
          delete animationFrameRef.current[fid];
        }
      }
    }

    // Update trail lines
    if (trailHistoryRef && trailHistoryRef.current) {
      const trailData = trailHistoryRef.current;

      for (const robot of robots) {
        const trail = trailData[robot.id];
        if (!trail || trail.length < 2) continue;

        const coords = trail.map((pos) => fromLonLat(pos));
        const trailId = 'trail-' + robot.id;
        const existingTrail = trailSource.current.getFeatureById(trailId);

        const trailType = robot.robotType || robot.type || 'ground';
        const trailColors = TYPE_TRAIL_COLORS[trailType] || TYPE_TRAIL_COLORS.ground;
        const trailColor = trailColors[robot.status] || trailColors.idle;
        const trailStyle = new Style({
          stroke: new Stroke({
            color: trailColor,
            width: 2,
          }),
        });

        if (existingTrail) {
          existingTrail.getGeometry().setCoordinates(coords);
          existingTrail.setStyle(trailStyle);
        } else {
          const trailFeature = new Feature({
            geometry: new LineString(coords),
          });
          trailFeature.setId(trailId);
          trailFeature.setStyle(trailStyle);
          trailSource.current.addFeature(trailFeature);
        }
      }
    }
  }, [robots, selectedRobotId, trailHistoryRef]);

  // Update station features
  useEffect(() => {
    if (!stations || stations.length === 0) return;

    for (const station of stations) {
      const coords = fromLonLat([station.longitude, station.latitude]);
      const stationId = 'station-' + station.id;
      const existing = stationSource.current.getFeatureById(stationId);
      const occupied = station.occupied || 0;

      if (existing) {
        existing.setStyle(stationStyle(occupied, station.capacity));
      } else {
        const feature = new Feature({
          geometry: new Point(coords),
          stationId: station.id,
        });
        feature.setId(stationId);
        feature.setStyle(stationStyle(occupied, station.capacity));
        stationSource.current.addFeature(feature);
      }
    }
  }, [stations]);

  // Update FOV cone features
  useEffect(() => {
    if (!robots || robots.length === 0) return;

    fovSource.current.clear();

    for (const robot of robots) {
      if (robot.longitude == null || robot.latitude == null) continue;

      const feature = createFovFeature(robot);
      const robotType = robot.robotType || robot.type || 'ground';
      feature.setStyle(fovStyle(robotType));
      fovSource.current.addFeature(feature);
    }
  }, [robots]);

  // Update path history polyline
  useEffect(() => {
    pathHistorySource.current.clear();
    if (!pathHistoryPositions || pathHistoryPositions.length < 2) return;

    const coords = pathHistoryPositions.map(p => fromLonLat([p.longitude, p.latitude]));
    const feature = new Feature({ geometry: new LineString(coords) });
    feature.setStyle(new Style({
      stroke: new Stroke({
        color: 'rgba(240, 180, 41, 0.6)',
        width: 2,
        lineDash: [6, 4],
      }),
    }));
    pathHistorySource.current.addFeature(feature);
  }, [pathHistoryPositions]);

  // Clear path history and tracking when no robot selected
  useEffect(() => {
    if (!selectedRobotId) {
      pathHistorySource.current.clear();
      prevSelectedRef.current = null;
    }
  }, [selectedRobotId]);

  // Follow selected robot — pan on selection and track on every position update
  useEffect(() => {
    if (!selectedRobotId || !mapInstance.current) return;

    const robot = robots.find((r) => r.id === selectedRobotId);
    if (!robot) return;

    const view = mapInstance.current.getView();
    const targetCenter = fromLonLat([robot.longitude, robot.latitude]);
    const currentCenter = view.getCenter();

    // On first selection: zoom in with animation
    if (!prevSelectedRef.current || prevSelectedRef.current !== selectedRobotId) {
      prevSelectedRef.current = selectedRobotId;
      view.animate({
        center: targetCenter,
        zoom: 18,
        duration: 500,
      });
    } else {
      // On subsequent ticks: smoothly track the robot
      const dx = Math.abs(targetCenter[0] - currentCenter[0]);
      const dy = Math.abs(targetCenter[1] - currentCenter[1]);
      if (dx > 1 || dy > 1) {
        view.animate({
          center: targetCenter,
          duration: 1000,
        });
      }
    }
  }, [selectedRobotId, robots]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapRef} className="w-full h-full" />;
}
