/**
 * Curated royalty-free sports media for investor demos.
 * Sources: Pexels (photos + videos), pravatar (fallback avatars).
 */

export function pexelsPhoto(id: number, w = 1080, h = 1350): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

export function portraitPhoto(id: number): string {
  return pexelsPhoto(id, 512, 512);
}

/** Short HD clips — autoplay-friendly in feed/stories/highlights. */
export const INVESTOR_VIDEOS = [
  "https://videos.pexels.com/video-files/4761787/4761787-hd_1280_720_25fps.mp4", // track sprint
  "https://videos.pexels.com/video-files/3129671/3129671-hd_1280_720_25fps.mp4", // football match
  "https://videos.pexels.com/video-files/5753864/5753864-hd_1280_720_25fps.mp4", // gym training
  "https://videos.pexels.com/video-files/4678270/4678270-hd_1280_720_25fps.mp4", // basketball
  "https://videos.pexels.com/video-files/3195396/3195396-hd_1280_720_25fps.mp4", // soccer skills
  "https://videos.pexels.com/video-files/2795655/2795655-hd_1280_720_25fps.mp4", // cycling
  "https://videos.pexels.com/video-files/6270636/6270636-hd_1280_720_25fps.mp4", // swimming pool
  "https://videos.pexels.com/video-files/5155396/5155396-hd_1280_720_25fps.mp4", // boxing pads
  "https://videos.pexels.com/video-files/4761963/4761963-hd_1280_720_25fps.mp4", // rugby/field
  "https://videos.pexels.com/video-files/5752729/5752729-hd_1280_720_25fps.mp4", // crossfit wod
] as const;

/** Action shots for feed posts & story stills. */
export const ACTION_PHOTOS = [
  3621104, 274506, 1263349, 1576672, 3775151, 3991879, 863988, 248547, 1171084,
  2680832, 3757377, 3621104, 1552242, 2294361, 47730, 163452, 841130, 209977,
  3329574, 3621104, 3993449, 3621104, 3621104, 3621104,
] as const;

/** Portrait IDs — athletic, diverse faces for avatars. */
export const PORTRAIT_PHOTOS = [
  3763188, 2379005, 1222271, 1681010, 1310522, 91227, 774909, 1681010, 1181690,
  1181686, 1181519, 1181695, 1181414, 1181685, 1181695, 1181414, 1181690, 1181519,
] as const;

export const VENUE_COVERS = [863988, 1171084, 248547, 3991879, 3775151, 1263349] as const;
export const TEAM_COVERS = [274506, 3621104, 1576672, 2294361, 1552242, 3993449] as const;

export function videoAt(i: number): string {
  return INVESTOR_VIDEOS[i % INVESTOR_VIDEOS.length];
}

export function actionPhotoAt(i: number): string {
  return pexelsPhoto(ACTION_PHOTOS[i % ACTION_PHOTOS.length], 1080, 1350);
}

export function portraitAt(i: number): string {
  return portraitPhoto(PORTRAIT_PHOTOS[i % PORTRAIT_PHOTOS.length]);
}
