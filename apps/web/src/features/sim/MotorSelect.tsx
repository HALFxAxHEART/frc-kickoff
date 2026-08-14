import { MOTOR_SPECS } from "@frckickoff/shared";

interface MotorSelectProps {
  motorId: string;
  numMotors: number;
  onMotorChange: (id: string) => void;
  onCountChange: (count: number) => void;
}

export function MotorSelect({ motorId, numMotors, onMotorChange, onCountChange }: MotorSelectProps) {
  return (
    <div className="field-row">
      <div className="field">
        <label>Motor</label>
        <select value={motorId} onChange={(e) => onMotorChange(e.target.value)}>
          {MOTOR_SPECS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label># of motors</label>
        <input type="number" min={1} max={8} value={numMotors} onChange={(e) => onCountChange(Math.max(1, Number(e.target.value)))} />
      </div>
    </div>
  );
}
