"use client";

import { useEffect, useState, type CSSProperties, type JSX } from "react";

import { coverStyleFor } from "@/lib/timeline";
import { useFilter } from "@/lib/timeline-context";
import { type Game } from "@/lib/connect/catalog";

function overrideStyle(backdrop: { url: string; seed: number }): CSSProperties {
  const style = { ...coverStyleFor(backdrop.url, backdrop.seed) };
  delete style.opacity;
  return style;
}

const ROTATION_INTERVAL_MS = 6000;

type GlobalBackgroundProps = {
  games: Game[];
  seeds: number[];
  onActivate?: (game: Game) => void;
};

export function GlobalBackground({ games, seeds }: GlobalBackgroundProps): JSX.Element | null {
  const { activeBackdrop } = useFilter();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (games.length <= 1) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setActiveIndex((previousIndex) => (previousIndex + 1) % games.length);
    }, ROTATION_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [games.length]);

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="tlx-global-bg" aria-hidden="true">
      {games.map((game, index) => {
        const isActive = index === activeIndex;
        const coverStyle = { ...coverStyleFor(game.heroImageUrl, seeds[index] ?? index) };
        delete coverStyle.opacity;
        return (
          <div
            key={game.id}
            className={`tlx-global-layer${isActive ? " tlx-global-layer-on" : ""}`}
            style={coverStyle}
          />
        );
      })}

      {activeBackdrop !== null ? (
        <div className="tlx-global-override" style={overrideStyle(activeBackdrop)} />
      ) : null}

      <div className="tlx-global-vignette" />
    </div>
  );
}
