import { ui } from "@/lib/i18n";
import type { PcSpec } from "@/gen/btb/games/v1/games_pb";

export function PcSpecsBlock({ title, spec }: { title: string; spec: PcSpec }) {
  const rows: [string, string][] = [
    [ui.detail.specOs, spec.os],
    [ui.detail.specCpu, spec.processor],
    [ui.detail.specRam, spec.memory],
    [ui.detail.specGpu, spec.graphics],
    [ui.detail.specStorage, spec.storage],
  ];
  const present = rows.filter(([, value]) => value !== "");
  if (present.length === 0) {
    return null;
  }
  return (
    <div className="dv-specs-col">
      <span className="dv-specs-h font-label">{title}</span>
      {present.map(([label, value]) => (
        <span key={label} className="dv-specs-row">
          <b className="dv-specs-k">{label}</b> {value}
        </span>
      ))}
    </div>
  );
}
