import { useSearchParams } from "react-router-dom";
import { ArmSimulator } from "../features/sim/ArmSimulator";
import { LinearSimulator } from "../features/sim/LinearSimulator";
import { FlywheelSimulator } from "../features/sim/FlywheelSimulator";
import { ClimberConfigurator } from "../features/sim/ClimberConfigurator";
import { PartsAndVendors } from "../features/sim/PartsAndVendors";
import { PinkArmSimulator } from "../features/sim/PinkArmSimulator";

const TOOLS = [
  { id: "arm", label: "4-Bar / Arm" },
  { id: "slapdown", label: "Slapdown Intake" },
  { id: "linear", label: "Linear" },
  { id: "pinkarm", label: "Pivot + Telescope" },
  { id: "shooter", label: "Shooter" },
  { id: "climber", label: "Climber Stages" },
  { id: "parts", label: "Parts & Vendors" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

export function SimulatePage() {
  // The URL is the single source of truth for which tab is active — no local state to keep in
  // sync. The Climber Stages tab links here with a new `?tool=` param without unmounting this
  // page (same route); deriving `tool` straight from searchParams on every render means that
  // Link always takes effect immediately, with no risk of stale local state.
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuery = searchParams.get("tool") as ToolId | null;
  const tool: ToolId = fromQuery && TOOLS.some((t) => t.id === fromQuery) ? fromQuery : "arm";

  function selectTool(id: ToolId) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tool", id);
      return next;
    });
  }

  return (
    <div>
      <h1>Simulate</h1>
      <p className="lede">
        Recalc-style mechanism calculators — plug in a motor, gearing, and geometry and see real speed, time, and
        current numbers before you cut metal. All physics runs locally in your browser as you type.
      </p>

      <div className="tabs">
        {TOOLS.map((t) => (
          <button key={t.id} className={t.id === tool ? "active" : ""} onClick={() => selectTool(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tool === "arm" && <ArmSimulator variant="arm" />}
      {tool === "slapdown" && <ArmSimulator variant="slapdown" />}
      {tool === "linear" && <LinearSimulator />}
      {tool === "pinkarm" && <PinkArmSimulator />}
      {tool === "shooter" && <FlywheelSimulator />}
      {tool === "climber" && <ClimberConfigurator />}
      {tool === "parts" && <PartsAndVendors />}

      {tool !== "parts" && (
        <p className="source-note">
          Motor specs (free speed, stall torque, stall current) verified 2026-08-14 against vendor datasheets and
          WPILib's motor dataset — the same figures reca.lc and the JVN calculator use. The motor model doesn't
          account for battery voltage sag or motor-controller current limiting, both of which reduce real torque
          below what's shown here under heavy load — treat these numbers as a sizing starting point, not a
          guarantee, and validate against a real prototype before committing a final design.
        </p>
      )}
    </div>
  );
}
