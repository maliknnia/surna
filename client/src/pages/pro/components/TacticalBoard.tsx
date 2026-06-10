import { useCallback, useRef, useState, type PointerEvent } from "react";
import { RotateCcw, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import {
  type PitchPlayer,
  getFormationsForLayout,
  getFormationTemplate,
  snapToFormation,
} from "../lib/tacticalFormations";
import {
  getLayoutMeta,
  type SportTacticalLayoutId,
} from "@shared/sportTacticalLayouts";
import PitchSurface, { layoutSurfaceClass, roleTokenClass } from "./PitchSurface";

type TacticalBoardProps = {
  layoutId: SportTacticalLayoutId;
  formationKey: string;
  onFormationChange: (key: string) => void;
  players: PitchPlayer[];
  onPlayersChange: (players: PitchPlayer[]) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  playerNotes?: Record<string, string>;
  noteForSlot?: string;
  onNoteChange?: (slotId: string, note: string) => void;
};

function DraggableToken({
  player,
  selected,
  dragging,
  hasNote,
  showNames,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  player: PitchPlayer;
  selected: boolean;
  dragging: boolean;
  hasNote: boolean;
  showNames: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
}) {
  const firstName = player.name.split(" ")[0];
  const roleClass = roleTokenClass(player.role);
  const ringRoleClass = roleClass.replace("__disc", "__ring");

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`pro-tactical-token${selected ? " pro-tactical-token--selected" : ""}${dragging ? " pro-tactical-token--dragging" : ""}`}
      style={{
        left: `${player.x}%`,
        top: `${player.y}%`,
      }}
      aria-label={`${player.name}, ${player.role}`}
    >
      <span className={`pro-tactical-token__ring ${ringRoleClass}`}>
        <span className={`pro-tactical-token__disc ${roleClass}`}>
          <span className="pro-tactical-token__number">{player.number}</span>
          {hasNote && <span className="pro-tactical-token__note-dot" aria-hidden />}
        </span>
      </span>
      <span className="pro-tactical-token__role">{player.role}</span>
      {showNames && (
        <span className="pro-tactical-token__name">{firstName}</span>
      )}
    </button>
  );
}

export default function TacticalBoard({
  layoutId,
  formationKey,
  onFormationChange,
  players,
  onPlayersChange,
  selectedSlotId,
  onSelectSlot,
  playerNotes = {},
  noteForSlot,
  onNoteChange,
}: TacticalBoardProps) {
  const isFootballVisual = layoutId === "football";
  const pitchRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  const dragRef = useRef<{ slotId: string; pointerId: number } | null>(null);
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(true);

  const meta = getLayoutMeta(layoutId);
  const selectorKeys = getFormationsForLayout(layoutId);

  const updatePosition = useCallback(
    (slotId: string, clientX: number, clientY: number) => {
      const el = pitchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100));
      const next = playersRef.current.map((p) => (p.slotId === slotId ? { ...p, x, y } : p));
      playersRef.current = next;
      onPlayersChange(next);
    },
    [onPlayersChange],
  );

  const endDrag = useCallback((pointerId: number) => {
    if (dragRef.current?.pointerId === pointerId) {
      dragRef.current = null;
      setDraggingSlotId(null);
    }
  }, []);

  const handlePointerDown = (slotId: string) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectSlot(slotId);
    dragRef.current = { slotId, pointerId: e.pointerId };
    setDraggingSlotId(slotId);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    updatePosition(dragRef.current.slotId, e.clientX, e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    endDrag(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const applyFormation = (key: string) => {
    const template = getFormationTemplate(key);
    onFormationChange(key);
    onPlayersChange(snapToFormation(playersRef.current, template));
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
            Drag tokens to plan — tap to select, add notes, assign from squad
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
              <DraggableToken
                key={p.slotId}
                player={p}
                selected={selectedSlotId === p.slotId}
                dragging={draggingSlotId === p.slotId}
                hasNote={!!playerNotes[p.slotId]?.trim()}
                showNames={showNames}
                onPointerDown={handlePointerDown(p.slotId)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            ))}
          </div>
          <div className="pro-tactical-pitch__dir pro-tactical-pitch__dir--defense">
            <ChevronDown size={11} strokeWidth={2.5} />
            <span>Defense</span>
          </div>
        </div>
      </div>

      {selectedSlotId && onNoteChange && (
        <div className="pro-tactical-note">
          <label className="pro-tactical-note__label">
            Tactical note — {players.find((p) => p.slotId === selectedSlotId)?.name}
          </label>
          <input
            type="text"
            className="pro-tactical-note__input"
            value={noteForSlot ?? ""}
            onChange={(e) => onNoteChange(selectedSlotId, e.target.value)}
            placeholder="Press high, mark their 10, stay compact…"
          />
        </div>
      )}
    </div>
  );
}
