import { useEffect } from "react";
import { consumeCreateDraft, type CreateDraftPayload } from "@/lib/createDraftStorage";
import type { CreateMediaValue } from "@/components/create/CreateMediaSection";

type HydrateHandlers = {
  onCover?: (value: CreateMediaValue) => void;
  onLogo?: (value: CreateMediaValue) => void;
  onTitle?: (title: string) => void;
  onGallery?: (urls: string[]) => void;
};

export function useHydrateCreateDraft(handlers: HydrateHandlers): CreateDraftPayload | null {
  useEffect(() => {
    const draft = consumeCreateDraft();
    if (!draft) return;
    if (draft.cover && handlers.onCover) handlers.onCover(draft.cover);
    if (draft.logo && handlers.onLogo) handlers.onLogo(draft.logo);
    if (draft.title && handlers.onTitle) handlers.onTitle(draft.title);
    if (draft.gallery?.length && handlers.onGallery) handlers.onGallery(draft.gallery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return null;
}
