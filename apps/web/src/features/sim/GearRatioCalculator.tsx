import { useState } from "react";

interface Stage {
  id: string;
  drivingTeeth: number;
  drivenTeeth: number;
}

function newId() {
  return crypto.randomUUID();
}

/**
 * Works identically for gear meshes, chain/sprocket stages, and belt/pulley stages — each is
 * just a driving-tooth-count : driven-tooth-count ratio, multiplied across stages.
 */
export function GearRatioCalculator() {
  const [stages, setStages] = useState<Stage[]>([
    { id: newId(), drivingTeeth: 12, drivenTeeth: 60 },
    { id: newId(), drivingTeeth: 14, drivenTeeth: 42 },
  ]);

  const overallRatio = stages.reduce((acc, s) => acc * (s.drivenTeeth / Math.max(1, s.drivingTeeth)), 1);

  function updateStage(id: string, field: "drivingTeeth" | "drivenTeeth", value: number) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: Math.max(1, value) } : s)));
  }

  return (
    <div className="card">
      <h3>Gear Ratio Calculator</h3>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Works the same for gear meshes, chain/sprocket stages, or belt/pulley stages — each is just a
        driving:driven tooth-count ratio. Add one row per reduction stage.
      </p>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Driving teeth</th>
            <th>Driven teeth</th>
            <th>Stage ratio</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => (
            <tr key={s.id}>
              <td>{i + 1}</td>
              <td>
                <input type="number" min={1} value={s.drivingTeeth} onChange={(e) => updateStage(s.id, "drivingTeeth", Number(e.target.value))} style={{ width: 70 }} />
              </td>
              <td>
                <input type="number" min={1} value={s.drivenTeeth} onChange={(e) => updateStage(s.id, "drivenTeeth", Number(e.target.value))} style={{ width: 70 }} />
              </td>
              <td>{(s.drivenTeeth / s.drivingTeeth).toFixed(2)}:1</td>
              <td>
                <button onClick={() => setStages((prev) => prev.filter((x) => x.id !== s.id))} style={{ padding: "2px 6px" }}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
        <button onClick={() => setStages((prev) => [...prev, { id: newId(), drivingTeeth: 12, drivenTeeth: 36 }])}>+ Stage</button>
        <div style={{ marginLeft: "auto" }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Overall ratio (motor:output) —{" "}
          </span>
          <strong style={{ fontSize: "1.2rem", color: "var(--series-1)" }}>{overallRatio.toFixed(2)}:1</strong>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem", marginTop: 8 }}>
        Type this number into any Simulate tab's "Gear ratio" field.
      </p>
    </div>
  );
}
