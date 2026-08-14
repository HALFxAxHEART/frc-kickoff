import { useMemo } from "react";
import { M_TO_INCH } from "@frckickoff/shared";
import { useScrubPlayback } from "./useScrubPlayback";

interface ElevatorDiagramProps {
  travelM: number;
  stageCount: number;
  angleFromVerticalDeg: number;
  gamePieceRadiusM: number;
}

const WIDTH = 260;
const HEIGHT = 340;
const BASE_Y = HEIGHT - 30;
const BASE_X = WIDTH / 2;
const HOUSING_PX = 50;
const COLUMN_WIDTH_PX = 34;
const PX_PER_METER = 160;

/**
 * Illustrative, not dimensionally precise — draws stages as evenly-spaced seams in a single
 * extending column rather than solving real nested-tube overlap geometry (that's what the
 * Climber / Elevator Stages tab is for). Good enough to show "does this go up smoothly and how far."
 */
export function ElevatorDiagram({ travelM, stageCount, angleFromVerticalDeg, gamePieceRadiusM }: ElevatorDiagramProps) {
  const { scrub, playing, setPlaying, setScrubManually } = useScrubPlayback();

  const currentHeightPx = HOUSING_PX + scrub * travelM * PX_PER_METER;
  const currentDistanceM = scrub * travelM;
  const ballRadiusPx = Math.max(5, gamePieceRadiusM * PX_PER_METER);

  const seamYs = useMemo(() => {
    const seams: number[] = [];
    for (let i = 1; i < stageCount; i++) {
      seams.push((i / stageCount) * currentHeightPx);
    }
    return seams;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCount, currentHeightPx]);

  const topY = BASE_Y - currentHeightPx;

  return (
    <div>
      <div className="chart-wrap">
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Elevator diagram">
          <g transform={`rotate(${angleFromVerticalDeg} ${BASE_X} ${BASE_Y})`}>
            {/* base/frame mount */}
            <rect x={BASE_X - COLUMN_WIDTH_PX / 2 - 6} y={BASE_Y - 6} width={COLUMN_WIDTH_PX + 12} height={10} fill="var(--baseline)" rx={2} />

            {/* extending column */}
            <rect
              x={BASE_X - COLUMN_WIDTH_PX / 2}
              y={topY}
              width={COLUMN_WIDTH_PX}
              height={currentHeightPx}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={3}
              rx={3}
            />
            {seamYs.map((seamOffsetFromTop, i) => (
              <line
                key={i}
                x1={BASE_X - COLUMN_WIDTH_PX / 2}
                x2={BASE_X + COLUMN_WIDTH_PX / 2}
                y1={BASE_Y - seamOffsetFromTop}
                y2={BASE_Y - seamOffsetFromTop}
                stroke="var(--series-3)"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            ))}

            <circle cx={BASE_X} cy={topY} r={ballRadiusPx} fill="var(--series-2)" opacity={0.85} />
          </g>
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "▶ Play"}</button>
        <input type="range" min={0} max={100} value={scrub * 100} onChange={(e) => setScrubManually(Number(e.target.value) / 100)} style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: "0.78rem", minWidth: 70, textAlign: "right" }}>
          {(currentDistanceM * M_TO_INCH).toFixed(1)} in
        </span>
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-1)" }} /> Stage wall
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-3)" }} /> Stage seam ({stageCount} stages)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--baseline)" }} /> Frame mount
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-2)", borderRadius: "50%" }} /> Game piece
        </span>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem" }}>
        Illustrative, not to scale — stage seams are evenly spaced here for a quick look at how it moves. For real
        per-stage lengths and overlap, use the Climber / Elevator Stages tab.
      </p>
    </div>
  );
}
