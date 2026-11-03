"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm"
    >
      <span className="text-sm">{label}</span>
      <span
        className={[
          "inline-flex h-6 w-11 items-center rounded-full border transition",
          checked ? "bg-neutral-900" : "bg-neutral-200",
        ].join(" ")}
      >
        <span
          className={[
            "h-5 w-5 rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
