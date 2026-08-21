import { Button } from "@chakra-ui/react";
import { randomRange } from "../../utils/assets";
import { useMemo } from "react";

export interface Star {
  id: number;
  ra: number;
  dec: number;
  display_name: string | null;
}

interface ClickableConstellationProps {
  stars: Star[];
  lines: [number, number][];
  order: number[];
  onOrderChange: (order: number[]) => void;
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Rough estimate of rendered text width for a 12px sans-serif label.
// Not pixel-perfect (that needs a DOM measurement/ref), but close
// enough to keep labels from running off the canvas edge.
function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.55;
}

type Anchor = "start" | "middle" | "end";

function textAnchorFor(angle: number): Anchor {
  const c = Math.cos(angle);
  if (c > 0.3) return "start";
  if (c < -0.3) return "end";
  return "middle";
}

// Clamps a label's x position so it stays on-canvas, accounting for
// which direction the text grows in based on its anchor.
function clampLabelX(
  x: number,
  text: string,
  fontSize: number,
  anchor: Anchor,
  canvasWidth: number,
  margin = 10,
) {
  const width = estimateTextWidth(text, fontSize);

  if (anchor === "start") {
    return clamp(x, margin, canvasWidth - width - margin);
  }
  if (anchor === "end") {
    return clamp(x, width + margin, canvasWidth - margin);
  }
  return clamp(x, width / 2 + margin, canvasWidth - width / 2 - margin);
}

// Scores candidate directions around a star by how "crowded" they are
// with other stars (closer stars, and stars more directly in that
// direction, count more). Returns the least-crowded angle.
function bestLabelAngle(
  starId: number,
  positions: Map<number, { x: number; y: number }>,
): number {
  const self = positions.get(starId);
  if (!self) return -Math.PI / 2;

  const others = Array.from(positions.entries()).filter(
    ([id]) => id !== starId,
  );
  if (others.length === 0) return -Math.PI / 2;

  const candidateCount = 24;
  const sigma = (25 * Math.PI) / 180; // angular "spread" of influence, ~25 degrees

  let bestAngle = -Math.PI / 2;
  let bestScore = Infinity;

  for (let i = 0; i < candidateCount; i++) {
    const candidate = (i / candidateCount) * 2 * Math.PI - Math.PI;
    let score = 0;

    for (const [, pos] of others) {
      const dx = pos.x - self.x;
      const dy = pos.y - self.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001) continue;

      const angleToOther = Math.atan2(dy, dx);
      const diff = normalizeAngle(candidate - angleToOther);
      const angularWeight = Math.exp(-(diff * diff) / (2 * sigma * sigma));
      const proximityWeight = 1 / (dist * dist);

      score += angularWeight * proximityWeight;
    }

    if (score < bestScore) {
      bestScore = score;
      bestAngle = candidate;
    }
  }

  return bestAngle;
}

const CANVAS_SIZE = 600;

export function ClickableConstellation({
  stars,
  lines,
  order,
  onOrderChange,
}: ClickableConstellationProps) {
  const starById = new Map(stars.map((star) => [star.id, star]));
  const minRa = Math.min(...stars.map((s) => s.ra));
  const maxRa = Math.max(...stars.map((s) => s.ra));
  const minDec = Math.min(...stars.map((s) => s.dec));
  const maxDec = Math.max(...stars.map((s) => s.dec));

  const toX = (ra: number) => 50 + (1 - (ra - minRa) / (maxRa - minRa)) * 500;
  const toY = (dec: number) =>
    50 + (1 - (dec - minDec) / (maxDec - minDec)) * 500;

  const positions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    stars.forEach((star) =>
      map.set(star.id, { x: toX(star.ra), y: toY(star.dec) }),
    );
    return map;
  }, [stars]);

  const labelAngles = useMemo(() => {
    const angles = new Map<number, number>();
    stars.forEach((star) =>
      angles.set(star.id, bestLabelAngle(star.id, positions)),
    );
    return angles;
  }, [stars, positions]);

  const handleStarClick = (id: number) => {
    const existingIndex = order.indexOf(id);
    if (existingIndex === -1) {
      onOrderChange([...order, id]);
    } else {
      onOrderChange(order.filter((starId) => starId !== id));
    }
  };

  const twinkleDurations = useMemo(() => {
    const durations = new Map<number, number>();
    stars.forEach((star) => {
      durations.set(star.id, randomRange(2, 3));
    });
    return durations;
  }, [stars]);

  return (
    <svg viewBox="0 0 600 600" width="100%" style={{ display: "block" }}>
      <style>{`
        .pt-constellation-dot {
          transition: filter 150ms ease, transform 150ms ease;
          filter: drop-shadow(0 0 2px #fff);
          transform-box: fill-box;
          transform-origin: center;
        }
        .pt-constellation-group:hover .pt-constellation-dot:not(.selected) {
          filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px #6fd8ff);
          transform: scale(1.15);
        }
        .pt-constellation-dot.selected {
          animation: twinkle var(--twinkle-duration, 2.5s) infinite alternate;
        }
        .pt-constellation-group:hover .pt-constellation-dot.selected {
          filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #0ff);
        }
        .pt-constellation-name {
          opacity: 0;
          transition: opacity 150ms ease;
          pointer-events: none;
        }
        .pt-constellation-group:hover .pt-constellation-name {
          opacity: 1;
        }
      `}</style>
      <rect x="0" y="0" rx="7" width="600" height="600" fill="#0b0c15" />
      {lines.map(([a, b]) => {
        const starA = starById.get(a);
        const starB = starById.get(b);
        if (!starA || !starB) return null;

        return (
          <line
            key={`${a}-${b}`}
            x1={toX(starA.ra)}
            y1={toY(starA.dec)}
            x2={toX(starB.ra)}
            y2={toY(starB.dec)}
            stroke="#ffffff"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        );
      })}
      {stars.map((star) => {
        const orderIndex = order.indexOf(star.id);
        const isSelected = orderIndex !== -1;
        const cx = toX(star.ra);
        const cy = toY(star.dec);

        const numberAngle = labelAngles.get(star.id) ?? -Math.PI / 2;
        const nameAngle = numberAngle + Math.PI; // always opposite, never swaps

        const numberDist = 18;
        const rawNumberX = cx + Math.cos(numberAngle) * numberDist;
        const numberY = clamp(cy + Math.sin(numberAngle) * numberDist, 15, 585);
        const numberAnchor = textAnchorFor(numberAngle);
        const numberX = clampLabelX(
          rawNumberX,
          String(orderIndex + 1),
          20,
          numberAnchor,
          CANVAS_SIZE,
        );

        const nameDist = 22;
        const rawNameX = cx + Math.cos(nameAngle) * nameDist;
        const nameY = clamp(cy + Math.sin(nameAngle) * nameDist, 15, 585);
        const nameAnchor = textAnchorFor(nameAngle);
        const nameX = star.display_name
          ? clampLabelX(
              rawNameX,
              star.display_name,
              12,
              nameAnchor,
              CANVAS_SIZE,
            )
          : rawNameX;

        return (
          <g
            key={star.id}
            className="pt-constellation-group"
            onClick={() => handleStarClick(star.id)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-pressed={isSelected}
            aria-label={
              star.display_name
                ? `${star.display_name}${isSelected ? `, position ${orderIndex + 1} in playback order` : ""}`
                : `Star ${star.id}`
            }
          >
            {star.display_name && <title>{star.display_name}</title>}

            <circle cx={cx} cy={cy} r={16} fill="transparent" />
            <circle
              cx={cx}
              cy={cy}
              r={7}
              fill={"white"}
              stroke={"white"}
              strokeWidth={1.5}
              className={`pt-constellation-dot${isSelected ? " selected" : ""}`}
              style={
                {
                  "--twinkle-duration": `${twinkleDurations.get(star.id)}s`,
                } as React.CSSProperties
              }
            />
            {isSelected && (
              <text
                x={numberX}
                y={numberY}
                fill="#ccefff"
                style={{ fontSize: 20 }}
                fontWeight="bold"
                textAnchor={numberAnchor}
                dominantBaseline="central"
                pointerEvents="none"
              >
                {orderIndex + 1}
              </text>
            )}
            {star.display_name && (
              <text
                className="pt-constellation-name"
                x={nameX}
                y={nameY}
                fill="#e8f4fb"
                textAnchor={nameAnchor}
                dominantBaseline="central"
                style={{ fontSize: 12 }}
              >
                {star.display_name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
