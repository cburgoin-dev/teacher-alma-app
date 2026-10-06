type Box = { x: number; y: number; width: number; height: number };
/** Visual anchors for bundled landscapes, never progression/access rules. Remote covers use center. */
export function courseArtworkFrame(level: string | null, box: Box, aspectRatio = 1.5, bundled = true) {
  const focalX = bundled && level?.trim().toUpperCase() === 'A1' ? 0.64 : 0.5;
  const height = Math.max(box.height, box.width / aspectRatio);
  const width = height * aspectRatio;
  return {
    x: box.x + Math.max(box.width - width, Math.min(0, box.width / 2 - width * focalX)),
    y: box.y + (box.height - height) / 2, width, height,
  };
}
