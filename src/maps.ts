// Apple Maps deep link. Opens the native Maps app on iOS/macOS and the Apple
// Maps web UI elsewhere, searching for the given place/address.
export const appleMapsUrl = (query: string) =>
  `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
