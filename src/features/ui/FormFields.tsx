interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: SliderProps) {
  return (
    <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="tabular-nums text-slate-500">{value.toFixed(2)}</span>
      </span>
      <input
        className="w-full accent-cyan-700"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
