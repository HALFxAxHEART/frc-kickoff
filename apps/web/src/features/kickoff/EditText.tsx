import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Single-line feel, but wraps and grows instead of cutting off long text. Commits on Enter. */
  autoGrow?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

/**
 * Text field that only saves on blur (or Enter for single-line). While it's focused it ignores
 * incoming values, so the live poll can't overwrite what someone is in the middle of typing.
 */
export function EditText({ value, onCommit, placeholder, multiline, autoGrow, rows = 3, style, ariaLabel }: Props) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!autoGrow || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [draft, autoGrow]);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  function commit() {
    focused.current = false;
    if (draft !== value) onCommit(draft);
  }

  const common = {
    value: draft,
    placeholder,
    style,
    "aria-label": ariaLabel ?? placeholder,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: commit,
  };

  if (autoGrow) {
    return (
      <textarea
        {...common}
        ref={areaRef}
        rows={1}
        className="autogrow"
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />
    );
  }
  if (multiline) {
    return <textarea {...common} rows={rows} onChange={(e) => setDraft(e.target.value)} />;
  }
  return (
    <input
      {...common}
      type="text"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
