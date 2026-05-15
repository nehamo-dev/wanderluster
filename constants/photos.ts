// Curated Unsplash photos per destination
// Format: images.unsplash.com/photo-{id}?w=600&q=85&fit=crop
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=85&fit=crop`;

export const FOLIO_PHOTOS: Record<string, string> = {
  tokyo:     U('1536098561742-ca998e48cbcc'), // cherry blossoms, Ueno park
  salzburg:  U('1467269204594-9661b134dd2b'), // Salzburg old town winter
  yosemite:  U('1759365660630-6ab3b99d9637'),   // Yosemite valley, El Capitan
  austin:    U('1531218150217-54595bc2b934'), // Austin skyline at night
};

export const WISHLIST_PHOTOS: Record<string, string> = {
  patagonia: U('1501854140801-50d01698950b'), // Torres del Paine peaks
  kyoto:     U('1528360983277-13d401cdc186'), // Fushimi Inari torii gates
  rome:      U('1552832230-c0197dd311b5'),      // Colosseum at dusk
  marrakech: U('1580746738099-1cb74f972feb'), // Marrakech souk, baskets and spices
};

// Look up a photo by folio id first, then by destination name (lowercase)
const ALL_PHOTOS = { ...FOLIO_PHOTOS, ...WISHLIST_PHOTOS };

export function getDestinationPhoto(folioId: string, destination?: string): string | null {
  if (ALL_PHOTOS[folioId]) return ALL_PHOTOS[folioId];
  if (destination) {
    // Match "Austin, Texas" → "austin", "New York City" → "new york" etc.
    const key = destination.toLowerCase().split(',')[0].trim();
    const match = ALL_PHOTOS[key] ?? Object.entries(ALL_PHOTOS).find(([k]) => key.startsWith(k) || k.startsWith(key))?.[1];
    if (match) return match;
  }
  return null;
}
