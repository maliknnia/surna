import type { CreateOptionId } from "@/lib/createHub";
import type { CreateMediaValue } from "@/components/create/CreateMediaSection";

export type CreateDraftPayload = {
  type?: CreateOptionId;
  title?: string;
  cover?: CreateMediaValue;
  logo?: CreateMediaValue;
  gallery?: string[];
};

const STORAGE_KEY = "surna_create_draft";

export function saveCreateDraft(draft: CreateDraftPayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadCreateDraft(): CreateDraftPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CreateDraftPayload;
  } catch {
    return null;
  }
}

export function clearCreateDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Read draft once when opening a create form, then clear. */
export function consumeCreateDraft(): CreateDraftPayload | null {
  const draft = loadCreateDraft();
  if (draft) clearCreateDraft();
  return draft;
}
