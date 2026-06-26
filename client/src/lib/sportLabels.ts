export {
  getSportLabels,
  normalizeSportKey,
  formatActivityVersus,
  FLAGSHIP_SPORTS,
  type SportLabels,
} from "@shared/sportLabels";

import { getSportLabels } from "@shared/sportLabels";

/** Hook-friendly helper — pass team.sport from components */
export function sportLabelsFor(sport: string | null | undefined) {
  return getSportLabels(sport);
}
