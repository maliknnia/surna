/** Shared join-template types for team creation + membership applications */

export type TeamJoinQuestionType = "text" | "yesno" | "select";

export type TeamJoinQuestion = {
  id: string;
  type: TeamJoinQuestionType;
  label: string;
  required?: boolean;
  options?: string[];
};

export type TeamJoinDocument = {
  id: string;
  title: string;
  body: string;
  required?: boolean;
};

export type TeamJoinRequirements = {
  questions: TeamJoinQuestion[];
  documents: TeamJoinDocument[];
};

export const EMPTY_JOIN_REQUIREMENTS: TeamJoinRequirements = {
  questions: [],
  documents: [],
};

export type TeamJoinPolicy = "open" | "approval" | "invite_only";

export function parseJoinRequirements(raw: unknown): TeamJoinRequirements {
  if (!raw || typeof raw !== "object") return EMPTY_JOIN_REQUIREMENTS;
  const o = raw as Record<string, unknown>;
  const questions = Array.isArray(o.questions) ? o.questions : [];
  const documents = Array.isArray(o.documents) ? o.documents : [];
  return {
    questions: questions.filter((q): q is TeamJoinQuestion => {
      return (
        typeof q === "object" &&
        q !== null &&
        typeof (q as TeamJoinQuestion).id === "string" &&
        typeof (q as TeamJoinQuestion).label === "string"
      );
    }),
    documents: documents.filter((d): d is TeamJoinDocument => {
      return (
        typeof d === "object" &&
        d !== null &&
        typeof (d as TeamJoinDocument).id === "string" &&
        typeof (d as TeamJoinDocument).title === "string"
      );
    }),
  };
}

export function teamHasJoinSteps(requirements: TeamJoinRequirements, joinFeeCents = 0): boolean {
  return (
    requirements.questions.length > 0 ||
    requirements.documents.length > 0 ||
    joinFeeCents > 0
  );
}
