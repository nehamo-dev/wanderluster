// Wikimedia Commons photos — free, CC-licensed, exact destination shots
const W = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

export const FOLIO_PHOTOS: Record<string, string> = {
  tokyo:    W('b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/960px-Skyscrapers_of_Shinjuku_2009_January.jpg'),
  salzburg: W('9/91/Salzburg_%2848489551981%29.jpg/960px-Salzburg_%2848489551981%29.jpg'),
  yosemite: W('1/13/Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg/960px-Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg'),
  austin:   W('f/f4/Skyline_of_Austin%2C_Texas_%28cropped%29.jpg/960px-Skyline_of_Austin%2C_Texas_%28cropped%29.jpg'),
  lisbon:   W('f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg/960px-Lisboa_-_Portugal_%2852597836992%29.jpg'),
  amsterdam: W('a/a9/Amsterdam_-_Jordaan.jpg/960px-Amsterdam_-_Jordaan.jpg'),
  bali:     W('3/34/Rice_Terrace_Bali.jpg/960px-Rice_Terrace_Bali.jpg'),
  ubud:     W('3/34/Rice_Terrace_Bali.jpg/960px-Rice_Terrace_Bali.jpg'),
  paris:    W('a/af/Tour_eiffel_at_sunrise_from_the_trocadero.jpg/960px-Tour_eiffel_at_sunrise_from_the_trocadero.jpg'),
  london:   W('6/67/London_Skyline_%28125508655%29.jpeg/960px-London_Skyline_%28125508655%29.jpeg'),
  barcelona: W('d/de/Barcelonata_neighbourhood_in_Barcelona.jpg/960px-Barcelonata_neighbourhood_in_Barcelona.jpg'),
  santorini: W('4/4e/Santorini_in_winter_seen_from_Thira_in_the_north_towards_south.jpg/960px-Santorini_in_winter_seen_from_Thira_in_the_north_towards_south.jpg'),
  greece:   W('4/4e/Santorini_in_winter_seen_from_Thira_in_the_north_towards_south.jpg/960px-Santorini_in_winter_seen_from_Thira_in_the_north_towards_south.jpg'),
  new_york: W('0/05/Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg/960px-Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg'),
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
    if (!src) return null;
    // Reject maps, flags, diagrams, SVG-derived PNGs (locator maps, coat of arms, etc.)
    const lower = src.toLowerCase();
    const isJunk = lower.endsWith('.svg') || lower.includes('.svg.png')
      || lower.includes('map') || lower.includes('flag') || lower.includes('locator')
      || lower.includes('marker') || lower.includes('logo') || lower.includes('coat')
      || lower.includes('outline') || lower.includes('blank') || lower.includes('seal');
    if (isJunk) return null;
    return src.split('?')[0]; // strip UTM params
  } catch {
    return null;
  }
}
