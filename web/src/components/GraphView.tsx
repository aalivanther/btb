"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";

import type { NodeObject, LinkObject } from "react-force-graph-2d";

import type { Game } from "@/lib/connect/catalog";
import {
  buildConnectionIndex,
  buildGraphData,
  relatedGames,
  type GraphLink,
  type GraphNode,
  type RelationType,
} from "@/lib/connections";
import { LANE_META, laneKeyFromEnum } from "@/lib/timeline";
import { CardTrailerPreview } from "@/components/CardTrailerPreview";
import { ui } from "@/lib/i18n";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const REASON_COLOR: Record<RelationType, string> = {
  franchise: "#ffcf3f",
  developer: "#38e0e0",
  publisher: "#a98bff",
  genre: "#7b8497",
};
const FOCUS_FILL = "#ffcf3f";
const NEIGHBOR_FILL = "#3a4256";
const SELECTED_FILL = "#ff5db1";
const NODE_STROKE = "#0a0b0d";
const LABEL_COLOR = "#eef1f6";

type RFNode = NodeObject & GraphNode;
type RFLink = LinkObject & Pick<GraphLink, "weight" | "reason">;

type FgHandle = { centerAt: (x?: number, y?: number, ms?: number) => void; zoom: (z: number, ms: number) => void };

type GraphViewProps = {
  catalog: Game[];
  focusGames: Game[];
  onOpen: (id: string) => void;
};

export function GraphView({ catalog, focusGames, onOpen }: GraphViewProps) {
  const index = useMemo(() => buildConnectionIndex(catalog), [catalog]);
  const gamesById = useMemo(() => new Map(catalog.map((game) => [game.id, game])), [catalog]);

  const [extraFocusIds, setExtraFocusIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveFocus = useMemo(() => {
    const ids = new Set(focusGames.map((game) => game.id));
    const extra = extraFocusIds.map((id) => gamesById.get(id)).filter((game): game is Game => !!game);
    return [...focusGames, ...extra.filter((game) => !ids.has(game.id))];
  }, [focusGames, extraFocusIds, gamesById]);

  const data = useMemo(
    () => buildGraphData(effectiveFocus, catalog, index),
    [effectiveFocus, catalog, index],
  );

  const [size, setSize] = useState({ width: 0, height: 0 });
  const observeSize = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fgRef = useRef<FgHandle | null>(null);

  const selectNode = useCallback((id: string, node?: RFNode) => {
    setSelectedId(id);
    setExtraFocusIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (node && node.x !== undefined && node.y !== undefined && fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(2.4, 600);
    }
  }, []);

  const openFull = useCallback(
    (id: string) => {
      const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
      if (doc.startViewTransition) doc.startViewTransition(() => onOpen(id));
      else onOpen(id);
    },
    [onOpen],
  );

  const selectedGame = selectedId ? gamesById.get(selectedId) : undefined;
  const selectedConnections = useMemo(
    () => (selectedGame ? relatedGames(selectedGame, catalog, index, { limit: 6 }) : []),
    [selectedGame, catalog, index],
  );
  const platformLabel = (game: Game): string => {
    const key = laneKeyFromEnum(game.platform);
    return key ? LANE_META[key].label : "";
  };

  return (
    <div ref={observeSize} className="cg-canvas">
      {size.width > 0 ? (
        <ForceGraph2D
          ref={fgRef as never}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          linkColor={(link: LinkObject) => REASON_COLOR[(link as RFLink).reason]}
          linkWidth={(link: LinkObject) => 0.6 + (link as RFLink).weight * 2.2}
          cooldownTicks={90}
          nodeCanvasObject={(rawNode: NodeObject, ctx, globalScale) => {
            const node = rawNode as RFNode;
            const isSelected = node.id === selectedId;
            const radius = isSelected ? 8 : node.focus ? 6 : 4;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isSelected ? SELECTED_FILL : node.focus ? FOCUS_FILL : NEIGHBOR_FILL;
            ctx.fill();
            ctx.lineWidth = 1.2 / globalScale;
            ctx.strokeStyle = NODE_STROKE;
            ctx.stroke();
            if (globalScale > 1.4 || node.focus || isSelected) {
              const fontSize = Math.max(3, 11 / globalScale);
              ctx.font = `${fontSize}px 'Space Grotesk', system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = LABEL_COLOR;
              const label = node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title;
              ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + radius + 1.5);
            }
          }}
          nodePointerAreaPaint={(node: NodeObject, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 8, 0, 2 * Math.PI);
            ctx.fill();
          }}
          onNodeClick={(node: NodeObject) => selectNode((node as RFNode).id, node as RFNode)}
        />
      ) : null}

      {selectedGame ? (
        <div className="cg-ficha" role="dialog" aria-label={selectedGame.title}>
          <button
            type="button"
            className="cg-ficha-close font-label"
            onClick={() => setSelectedId(null)}
            aria-label={ui.perfil.graphClose}
          >
            ✕
          </button>
          <div className="cg-ficha-media">
            {selectedGame.coverUrl ? (
              <span
                className="cg-ficha-cover"
                style={{ backgroundImage: `url(${selectedGame.coverUrl})` }}
                aria-hidden="true"
              />
            ) : null}
            <CardTrailerPreview youtubeKey={selectedGame.trailerYoutubeKey} active={true} />
          </div>
          <div className="cg-ficha-body">
            <p className="cg-ficha-title font-display">{selectedGame.title}</p>
            <p className="cg-ficha-meta font-label">
              {platformLabel(selectedGame)}
              {selectedGame.releaseDate ? ` · ${selectedGame.releaseDate}` : ""}
            </p>
            {selectedConnections.length > 0 ? (
              <div className="cg-ficha-jumps">
                <span className="cg-ficha-jumps-label font-label">{ui.perfil.graphJumps}</span>
                <div className="cg-ficha-chips">
                  {selectedConnections.map((conn) => (
                    <button
                      key={conn.game.id}
                      type="button"
                      className={`cg-jump cg-jump-${conn.reasons[0]?.type ?? "genre"} font-label`}
                      onClick={() => selectNode(conn.game.id)}
                      title={conn.reasons.map((r) => r.label).join(" · ")}
                    >
                      {conn.game.title.length > 24 ? `${conn.game.title.slice(0, 23)}…` : conn.game.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="cg-ficha-open font-label"
              onClick={() => openFull(selectedGame.id)}
            >
              {ui.perfil.graphOpenFull} →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
