import { useEffect, useState } from "react";

/** A number box that lets you type freely (e.g. "-" or "1.") and only commits real numbers. */
export function Num({ value, onChange, step = 0.1, min, max, width }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; width?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={text}
      style={width ? { width } : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(v)) onChange(v);
      }}
    />
  );
}
