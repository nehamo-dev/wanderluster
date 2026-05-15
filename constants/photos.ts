// Curated Unsplash photos per destination
// Format: images.unsplash.com/photo-{id}?w=600&q=85&fit=crop
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=85&fit=crop`;

export const FOLIO_PHOTOS: Record<string, string> = {
  tokyo:     U('1536098561742-ca998e48cbcc'), // cherry blossoms, Ueno park
  salzburg:  U('1467269204594-9661b134dd2b'), // Salzburg old town winter
  yosemite:  U('1562015053-d82cca3a5b28'),    // Tunnel View — El Capitan, Half Dome, Bridalveil Fall
};

export const WISHLIST_PHOTOS: Record<string, string> = {
  patagonia: U('1501854140801-50d01698950b'), // Torres del Paine peaks
  kyoto:     U('1528360983277-13d401cdc186'), // Fushimi Inari torii gates
  lofoten:   U('1516496636080-14fb876e029d'), // Lofoten red cabins + water
  marrakech: U('1570168007-7b1ee0e4ba2e'),    // Marrakech Jemaa el-Fna square at dusk
};

// Look up a photo by folio id first, then by destination name (lowercase)
export function getDestinationPhoto(folioId: string, destination?: string): string | null {
  if (FOLIO_PHOTOS[folioId]) return FOLIO_PHOTOS[folioId];
  if (destination) {
    const key = destination.toLowerCase();
    const match = Object.entries(FOLIO_PHOTOS).find(([k]) => k === key);
    if (match) return match[1];
  }
  return null;
}
