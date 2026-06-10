import type { FormationMessagePayload } from "../lib/tacticalFormations";
import { resolvePayloadLayout } from "../lib/tacticalFormations";
import { getLayoutMeta } from "@shared/sportTacticalLayouts";
import PitchSurface, { layoutSurfaceClass, roleTokenClass } from "./PitchSurface";

/** Mini pitch/court diagram for formation messages in team chat. */
export default function FormationMessageCard({
  data,
  viewerUserId,
}: {
  data: FormationMessagePayload;
  viewerUserId?: string | null;
}) {
  const layoutId = resolvePayloadLayout(data);
  const isFootballVisual = layoutId === "football";
  const meta = getLayoutMeta(layoutId);
  const personalNote =
    viewerUserId && data.notesByUserId?.[viewerUserId]
      ? data.notesByUserId[viewerUserId]
      : null;

  return (
    <div className={`pro-formation-card${isFootballVisual ? " pro-formation-card--football" : ""}`}>
      <div className="pro-formation-card__header">
        <span className="pro-formation-card__title">Formation</span>
        <span className="pro-formation-card__badge">{data.formationName}</span>
      </div>
      <div className="pro-formation-card__pitch-wrap">
        <div
          className={`pro-formation-card__pitch pro-tactical-pitch ${layoutSurfaceClass(layoutId)}`}
          style={{ aspectRatio: meta.aspectRatio }}
        >
          <div className="pro-tactical-pitch__base" aria-hidden />
          <div className="pro-tactical-pitch__stripes" aria-hidden />
          <PitchSurface layoutId={layoutId} compact />
          <div className="pro-tactical-pitch__vignette" aria-hidden />
          {data.players.map((p, i) => (
            <span
              key={i}
              className={`pro-formation-card__token ${roleTokenClass(p.role)}`}
              title={`${p.name} (${p.role})`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {p.number}
            </span>
          ))}
        </div>
      </div>
      <ul className="pro-formation-card__list">
        {data.players.map((p, i) => (
          <li key={i}>
            <strong className="pro-formation-card__num">#{p.number}</strong> {p.name}
            <span className="pro-formation-card__role">{p.role}</span>
          </li>
        ))}
      </ul>
      {personalNote && (
        <p className="pro-formation-card__note">Your note: {personalNote}</p>
      )}
    </div>
  );
}
