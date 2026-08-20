export interface Star {
  id: number;
  ra: number;
  dec: number;
  display_name: string | null;
}

interface ConstellationPlotProps {
  stars: Star[];
  lines: [number, number][];
}

export function ConstellationPlot({ stars, lines }: ConstellationPlotProps) {

  const starById = new Map(stars.map((star) => [star.id, star]));
  const minRa = Math.min(...stars.map((s) => s.ra));
  const maxRa = Math.max(...stars.map((s) => s.ra));

  const minDec = Math.min(...stars.map((s) => s.dec));
  const maxDec = Math.max(...stars.map((s) => s.dec));

  const toX = (ra: number) => {
    return 50 + (1 - (ra - minRa) / (maxRa - minRa)) * 500;
  };

  const toY = (dec: number) => {
    return 50 + (1 - (dec - minDec) / (maxDec - minDec)) * 500;
  };

  console.log(lines);

  return (
    <svg viewBox="0 0 600 600" width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width="600" height="600" fill="#0b0c15" />
      {lines.map(([a, b]) => {
        const starA = starById.get(a);
        const starB = starById.get(b);
        console.log(a, starA, b, starB);

        if (!starA || !starB) return null;

        return (
          <line
            key={`${a}-${b}`}
            x1={toX(starA.ra)}
            y1={toY(starA.dec)}
            x2={toX(starB.ra)}
            y2={toY(starB.dec)}
            stroke="white"
            strokeWidth={1}
          />
        );
      })}
      {stars.map((star) => (
        <circle
          key={star.id}
          cx={toX(star.ra)}
          cy={toY(star.dec)}
          r={7}
          fill="white"
        />
      ))}
    </svg>
  );
}
