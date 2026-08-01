import { useCallback, useRef, useState, type PointerEvent } from "react";
import { RotateCcw, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import {
  type PitchPlayer,
  type BenchPlayer,
  getFormationsForLayout,
  getFormationTemplate,
  snapToFormation,
  snapCoordsToNearestSlot,
  nearestSlotIndex,
  isPitchSlotFilled,
} from "../lib/tacticalFormations";
import {
  getLayoutMeta,
  type SportTacticalLayoutId,
} from "@shared/sportTacticalLayouts";
import PitchSurface, { layoutSurfaceClass, roleTokenClass } from "./PitchSurface";

export type ArchetypeChip = {
  key: string;
  label: string;
  formationKey: string;
};

type TacticalBoardProps = {
  layoutId: SportTacticalLayoutId;
  formationKey: string;
  onFormationChange: (key: string) => void;
  players: PitchPlayer[];
  onPlayersChange: (players: PitchPlayer[]) => void;
  bench: BenchPlayer[];
  onAssignFromBench: (benchPlayer: BenchPlayer, slotId: string) => void;
  onReturnToBench: (slotId: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  playerNotes?: Record<string, string>;
  noteForSlot?: string;
  onNoteChange?: (slotId: string, note: string) => void;
  archetypes?: ArchetypeChip[];
  archetypeKey?: string | null;
  onArchetypeSelect?: (key: string) => void;
};

function TokenFace({
  player,
  hasNote,
  showNames,
}: {
  player: Pick<PitchPlayer, "name" | "number" | "role" | "photoUrl">;
  hasNote?: boolean;
  showNames?: boolean;
}) {
  const firstName = player.name.split(" ")[0];
  const roleClass = roleTokenClass(player.role);
  const ringRoleClass = roleClass.replace("__disc", "__ring");

  return (
    <>
      <span className={`pro-tactical-token__ring ${ringRoleClass}`}>
        <span
          className={`pro-tactical-token__disc ${roleClass}${player.photoUrl ? " pro-tactical-token__disc--photo" : ""}`}
          style={
            player.photoUrl
              ? { backgroundImage: `url(${player.photoUrl})` }
              : undefined
          }
        >
          {!player.photoUrl && (
            <span className="pro-tactical-token__number">{player.number}</span>
          )}
          {player.photoUrl && (
            <span className="pro-tactical-token__number pro-tactical-token__number--overlay">
              {player.number}
            </span>
          )}
          {hasNote && <span className="pro-tactical-token__note-dot" aria-hidden />}
        </span>
      </span>
      <span className="pro-tactical-token__role">{player.role}</span>
      {showNames && <span className="pro-tactical-token__name">{firstName}</span>}
    </>
  );
}

function PitchToken({
  player,
  selected,
  dragging,
  empty,
  hasNote,
  showNames,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  player: PitchPlayer;
  selected: boolean;
  dragging: boolean;
  empty: boolean;
  hasNote: boolean;
  showNames: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`pro-tactical-token${selected ? " pro-tactical-token--selected" : ""}${dragging ? " pro-tactical-token--dragging" : ""}${empty ? " pro-tactical-token--empty" : ""}`}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      aria-label={empty ? `Empty ${player.role}` : `${player.name}, ${player.role}`}
    >
      <TokenFace player={player} hasNote={hasNote} showNames={showNames && !empty} />
    </button>
  );
}

export default function TacticalBoard({
  layoutId,
  formationKey,
  onFormationChange,
  players,
  onPlayersChange,
  bench,
  onAssignFromBench,
  onReturnToBench,
  selectedSlotId,
  onSelectSlot,
  playerNotes = {},
  noteForSlot,
  onNoteChange,
  archetypes = [],
  archetypeKey,
  onArchetypeSelect,
}: TacticalBoardProps) {
  const isFootballVisual = layoutId === "football";
  const pitchRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  const dragRef = useRef<{
    kind: "pitch" | "bench";
    id: string;
    pointerId: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; player: BenchPlayer | PitchPlayer } | null>(null);
  const [showNames, setShowNames] = useState(true);

  const meta = getLayoutMeta(layoutId);
  const selectorKeys = getFormationsForLayout(layoutId);
  const template = getFormationTemplate(formationKey);

  const clientToPitchPct = useCallback((clientX: number, clientY: number) => {
    const el = pitchRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    return {
      x: Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const isOverBench = useCallback((clientX: number, clientY: number) => {
    const el = benchRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const updatePitchPosition = useCallback(
    (slotId: string, clientX: number, clientY: number) => {
      const pct = clientToPitchPct(clientX, clientY);
      if (!pct) return;
      const next = playersRef.current.map((p) => (p.slotId === slotId ? { ...p, x: pct.x, y: pct.y } : p));
      playersRef.current = next;
      onPlayersChange(next);
    },
    [clientToPitchPct, onPlayersChange],
  );

  const endDrag = useCallback((pointerId: number) => {
    if (dragRef.current?.pointerId === pointerId) {
      dragRef.current = null;
      setDraggingId(null);
      setGhost(null);
    }
  }, []);

  const handlePitchPointerDown = (slotId: string) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectSlot(slotId);
    const player = playersRef.current.find((p) => p.slotId === slotId);
    if (!player || !isPitchSlotFilled(player)) return;
    dragRef.current = { kind: "pitch", id: slotId, pointerId: e.pointerId };
    setDraggingId(slotId);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePitchPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    if (dragRef.current.kind === "pitch") {
      updatePitchPosition(dragRef.current.id, e.clientX, e.clientY);
      setGhost({ x: e.clientX, y: e.clientY, player: playersRef.current.find((p) => p.slotId === dragRef.current!.id)! });
    }
  };

  const handlePitchPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const { kind, id } = dragRef.current;

    if (kind === "pitch") {
      if (isOverBench(e.clientX, e.clientY)) {
        onReturnToBench(id);
      } else {
        const pct = clientToPitchPct(e.clientX, e.clientY);
        if (pct) {
          const snapped = snapCoordsToNearestSlot(pct.x, pct.y, template);
          if (snapped) {
            const next = playersRef.current.map((p) =>
              p.slotId === id ? { ...p, x: snapped.x, y: snapped.y, role: snapped.role } : p,
            );
            playersRef.current = next;
            onPlayersChange(next);
          }
        }
      }
    }

    endDrag(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const handleBenchPointerDown = (player: BenchPlayer) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { kind: "bench", id: player.id, pointerId: e.pointerId };
    setDraggingId(player.id);
    setGhost({ x: e.clientX, y: e.clientY, player });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBenchPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.kind !== "bench" || dragRef.current.pointerId !== e.pointerId) return;
    const player = bench.find((b) => b.id === dragRef.current!.id);
    if (!player) return;
    setGhost({ x: e.clientX, y: e.clientY, player });
  };

  const handleBenchPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.kind !== "bench" || dragRef.current.pointerId !== e.pointerId) {
      return;
    }
    const benchId = dragRef.current.id;
    const player = bench.find((b) => b.id === benchId);
    const pct = clientToPitchPct(e.clientX, e.clientY);
    if (player && pct) {
      const snapped = snapCoordsToNearestSlot(pct.x, pct.y, template, 14);
      const slotIndex = snapped?.slotIndex ?? nearestSlotIndex(pct.x, pct.y, template);
      const target = playersRef.current[slotIndex];
      if (target) onAssignFromBench(player, target.slotId);
    }
    endDrag(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const applyFormation = (key: string) => {
    const nextTemplate = getFormationTemplate(key);
    onFormationChange(key);
    onPlayersChange(snapToFormation(playersRef.current, nextTemplate));
  };

  const resetFormation = () => {
    applyFormation(formationKey);
    onSelectSlot(null);
  };

  return (
    <div className={`pro-tactical-board${isFootballVisual ? " pro-tactical-board--football" : ""}`}>
      <div className="pro-tactical-board__header">
        <div>
          <p className="pro-tactical-board__hint">
            Drag from bench onto the pitch · reposition · drag back to bench to sub
          </p>
          <span className="pro-tactical-board__surface-tag">{meta.label}</span>
        </div>
        <div className="pro-tactical-board__tools">
          <button
            type="button"
            className="pro-tactical-tool"
            onClick={() => setShowNames((v) => !v)}
            title={showNames ? "Hide names" : "Show names"}
          >
            {showNames ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showNames ? "Hide names" : "Show names"}</span>
          </button>
          <button type="button" className="pro-tactical-tool" onClick={resetFormation} title="Reset positions">
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {selectorKeys.length > 0 && (
        <div className="pro-tactical-formations">
          {selectorKeys.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pro-tactical-formation-chip${formationKey === t.key ? " pro-tactical-formation-chip--active" : ""}`}
              onClick={() => applyFormation(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {archetypes.length > 0 && onArchetypeSelect && (
        <div className="pro-tactical-formations pro-tactical-formations--archetypes">
          {archetypes.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`pro-tactical-formation-chip${archetypeKey === a.key ? " pro-tactical-formation-chip--active" : ""}`}
              onClick={() => onArchetypeSelect(a.key)}
              title={a.label}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className={`pro-tactical-pitch-frame${isFootballVisual ? " pro-tactical-pitch-frame--football" : ""}`}>
        <div className="pro-tactical-pitch-wrap">
          <div className="pro-tactical-pitch__dir pro-tactical-pitch__dir--attack">
            <ChevronUp size={11} strokeWidth={2.5} />
            <span>Attack</span>
          </div>
          <div
            ref={pitchRef}
            className={`pro-tactical-pitch ${layoutSurfaceClass(layoutId)}${isFootballVisual ? " pro-tactical-pitch--fifa" : ""}`}
            style={{ aspectRatio: meta.aspectRatio }}
            onPointerDown={() => onSelectSlot(null)}
          >
            <div className="pro-tactical-pitch__stadium" aria-hidden />
            <div className="pro-tactical-pitch__base" aria-hidden />
            <div className="pro-tactical-pitch__stripes" aria-hidden />
            <div className="pro-tactical-pitch__grain" aria-hidden />
            <PitchSurface layoutId={layoutId} />
            <div className="pro-tactical-pitch__vignette" aria-hidden />
            <div className="pro-tactical-pitch__shine" aria-hidden />
            <div className="pro-tactical-pitch__floodlights" aria-hidden />
            {players.map((p) => (
              <PitchToken
                key={p.slotId}
                player={p}
                empty={!isPitchSlotFilled(p)}
                selected={selectedSlotId === p.slotId}
                dragging={draggingId === p.slotId}
                hasNote={!!playerNotes[p.slotId]?.trim()}
                showNames={showNames}
                onPointerDown={handlePitchPointerDown(p.slotId)}
                onPointerMove={handlePitchPointerMove}
                onPointerUp={handlePitchPointerUp}
              />
            ))}
          </div>
          <div className="pro-tactical-pitch__dir pro-tactical-pitch__dir--defense">
            <ChevronDown size={11} strokeWidth={2.5} />
            <span>Defense</span>
          </div>
        </div>
      </div>

      <div className="pro-tactical-bench" ref={benchRef}>
        <div className="pro-tactical-bench__label">Bench</div>
        {bench.length === 0 ? (
          <p className="pro-tactical-bench__empty">All available players are on the pitch</p>
        ) : (
          <div className="pro-tactical-bench__row">
            {bench.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`pro-tactical-bench__token${draggingId === b.id ? " pro-tactical-token--dragging" : ""}`}
                onPointerDown={handleBenchPointerDown(b)}
                onPointerMove={handleBenchPointerMove}
                onPointerUp={handleBenchPointerUp}
                onPointerCancel={handleBenchPointerUp}
                aria-label={`Bench ${b.name}`}
              >
                <TokenFace
                  player={{
                    name: b.name,
                    number: b.number ?? 0,
                    role: b.position || "SUB",
                    photoUrl: b.photoUrl,
                  }}
                  showNames
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {ghost && (
        <div
          className="pro-tactical-drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden
        >
          <TokenFace
            player={{
              name: ghost.player.name,
              number: "number" in ghost.player ? ghost.player.number : 0,
              role: "role" in ghost.player ? ghost.player.role : (ghost.player as BenchPlayer).position || "SUB",
              photoUrl: ghost.player.photoUrl,
            }}
          />
        </div>
      )}

      {selectedSlotId &&
        onNoteChange &&
        (() => {
          const selected = players.find((p) => p.slotId === selectedSlotId);
          if (!selected || !isPitchSlotFilled(selected)) return null;
          return (
            <div className="pro-tactical-note">
              <label className="pro-tactical-note__label">Tactical note — {selected.name}</label>
              <input
                type="text"
                className="pro-tactical-note__input"
                value={noteForSlot ?? ""}
                onChange={(e) => onNoteChange(selectedSlotId, e.target.value)}
                placeholder="Press high, mark their 10, stay compact…"
              />
            </div>
          );
        })()}
    </div>
  );
}
