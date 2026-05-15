// Wikimedia Commons photos — free, CC-licensed, exact destination shots
const W = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

export const FOLIO_PHOTOS: Record<string, string> = {
  tokyo:    W('b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/960px-Skyscrapers_of_Shinjuku_2009_January.jpg'),
  salzburg: W('9/91/Salzburg_%2848489551981%29.jpg/960px-Salzburg_%2848489551981%29.jpg'),
  yosemite: W('1/13/Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg/960px-Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg'),
  austin:   W('f/f4/Skyline_of_Austin%2C_Texas_%28cropped%29.jpg/960px-Skyline_of_Austin%2C_Texas_%28cropped%29.jpg'),
};

export const WISHLIST_PHOTOS: Record<string, string> = {
  patagonia: W('c/ce/Torres_del_Paine_y_cuernos_del_Paine%2C_montaje.jpg/960px-Torres_del_Paine_y_cuernos_del_Paine%2C_montaje.jpg'),
  kyoto:     W('3/3c/Kiyomizu.jpg/960px-Kiyomizu.jpg'),
  rome:      W('7/7e/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg/960px-Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg'),
  marrakech: W('9/9c/Pavillon_Menarag%C3%A4rten.jpg/960px-Pavillon_Menarag%C3%A4rten.jpg'),
};

const ALL_PHOTOS = { ...FOLIO_PHOTOS, ...WISHLIST_PHOTOS };

export function getDestinationPhoto(folioId: string, destination?: string): string | null {
  if (ALL_PHOTOS[folioId]) return ALL_PHOTOS[folioId];
  if (destination) {
    const key = destination.toLowerCase().split(',')[0].trim();
    const match = ALL_PHOTOS[key] ?? Object.entries(ALL_PHOTOS).find(([k]) => key.startsWith(k) || k.startsWith(key))?.[1];
    if (match) return match;
  }
  return null;
}

// Fetch the Wikipedia hero image for any destination (for dynamically created trips)
export async function fetchWikiPhoto(destination: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(destination)}&prop=pageimages&format=json&pithumbsize=900&origin=*&redirects=1`
    );
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    const src: string | undefined = page?.thumbnail?.source;
    if (!src || src.endsWith('.svg') || src.endsWith('.PNG') || src.includes('map')) return null;
    return src.split('?')[0]; // strip UTM params
  } catch {
    return null;
  }
}
