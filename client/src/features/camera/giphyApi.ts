export type GiphyItem = {
  id: string;
  url: string;
  preview: string;
  title: string;
};

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

const CATEGORY_TAGS: Record<string, string> = {
  Trending: "",
  Sports: "sports",
  Celebration: "celebration sports",
  Reactions: "reactions",
  GAA: "gaa hurling",
  Football: "football soccer",
  Cricket: "cricket",
};

/** Demo GIFs when no API key */
const DEMO_GIFS: GiphyItem[] = [
  { id: "d1", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", preview: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif", title: "Goal" },
  { id: "d2", url: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif", preview: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/200w.gif", title: "Celebrate" },
  { id: "d3", url: "https://media.giphy.com/media/26BRv0FlkhCOvy/giphy.gif", preview: "https://media.giphy.com/media/26BRv0FlkhCOvy/200w.gif", title: "Clap" },
  { id: "d4", url: "https://media.giphy.com/media/3o6Zt4HU9HIYfGCaFW/giphy.gif", preview: "https://media.giphy.com/media/3o6Zt4HU9HIYfGCaFW/200w.gif", title: "Fire" },
  { id: "d5", url: "https://media.giphy.com/media/5GoVLqeAOo6p6/giphy.gif", preview: "https://media.giphy.com/media/5GoVLqeAOo6p6/200w.gif", title: "Sport" },
  { id: "d6", url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif", preview: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/200w.gif", title: "Win" },
];

function mapGiphyData(data: { id: string; title: string; images: { fixed_height: { url: string }; preview_gif?: { url: string }; downsized_medium?: { url: string } } }[]): GiphyItem[] {
  return data.map((g) => ({
    id: g.id,
    title: g.title,
    url: g.images.downsized_medium?.url ?? g.images.fixed_height.url,
    preview: g.images.preview_gif?.url ?? g.images.fixed_height.url,
  }));
}

export async function fetchGifs(category: string, search = ""): Promise<GiphyItem[]> {
  if (!GIPHY_KEY) {
    if (search) {
      return DEMO_GIFS.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));
    }
    return DEMO_GIFS;
  }

  const tag = CATEGORY_TAGS[category] ?? category;
  const q = search.trim() || tag || "sports";
  const endpoint = search.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=pg-13`;

  const res = await fetch(endpoint);
  if (!res.ok) return DEMO_GIFS;
  const json = await res.json();
  return mapGiphyData(json.data ?? []);
}
