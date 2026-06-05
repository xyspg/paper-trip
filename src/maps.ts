// Apple Maps deep link. Opens the native Maps app on iOS/macOS and the Apple
// Maps web UI elsewhere, searching for the given place/address.
export const appleMapsUrl = (query: string) =>
  `https://maps.apple.com/?q=${encodeURIComponent(query)}`;

// Google Maps deep link. The `api=1` search endpoint opens the native app on
// mobile when installed and falls back to the web UI everywhere else.
export const googleMapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
