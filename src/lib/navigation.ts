export type MapProvider = "google" | "apple" | "waze";

const MAP_PROVIDER_LABEL: Record<MapProvider, string> = {
  google: "Google Maps",
  apple: "Apple Maps",
  waze: "Waze",
};

export const MAP_PROVIDERS: MapProvider[] = ["google", "apple", "waze"];

export function mapProviderLabel(provider: MapProvider): string {
  return MAP_PROVIDER_LABEL[provider];
}

/** Builds a universal link that opens the native app when installed, else falls back to the web. */
export function mapsUrl(provider: MapProvider, address: string): string {
  const query = encodeURIComponent(address);
  switch (provider) {
    case "google":
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    case "apple":
      return `https://maps.apple.com/?q=${query}`;
    case "waze":
      return `https://waze.com/ul?q=${query}&navigate=yes`;
  }
}
