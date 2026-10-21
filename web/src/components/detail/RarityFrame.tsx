import type { ReactNode } from "react";

import type { Tier } from "@/lib/rarity";

export function RarityFrame({
  tier,
  children,
  className = "",
}: {
  tier: Tier;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`c-rarity c-rarity-${tier} ${className}`.trim()}>
      <span className="c-rarity-inner">{children}</span>
      <span aria-hidden="true" className="c-rarity-gem" />
    </span>
  );
}
