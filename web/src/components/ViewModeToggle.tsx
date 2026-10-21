"use client";

import { type JSX } from "react";

import { useViewport, type ViewMode } from "@/lib/viewport-context";

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "movil", label: "Móvil" },
  { value: "escritorio", label: "Escritorio" },
];

type ViewModeToggleProps = {
  className?: string;
};

export function ViewModeToggle({ className = "" }: ViewModeToggleProps): JSX.Element {
  const { mode, setMode } = useViewport();
  return (
    <div className={`vm-toggle ${className}`.trim()} role="radiogroup" aria-label="Modo de vista">
      {OPTIONS.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`vm-opt font-label${active ? " is-on" : ""}`}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
