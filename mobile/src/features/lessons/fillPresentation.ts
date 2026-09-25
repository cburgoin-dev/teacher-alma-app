/** The underscore run is the authored blank marker, never an inferred answer. */
export function fillParts(prompt: string): { before: string; after: string } | null {
  const markers = [...prompt.matchAll(/_{2,}/g)];
  if (markers.length !== 1) return null;
  const marker = markers[0];
  return { before: prompt.slice(0, marker.index), after: prompt.slice(marker.index! + marker[0].length) };
}
