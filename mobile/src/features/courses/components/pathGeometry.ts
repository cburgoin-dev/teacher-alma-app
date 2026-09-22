export type MapPoint = { x: number; y: number };
export type MapStop = MapPoint & { top: number; height: number; size: number; right: boolean };

// Only viewport/presentation inputs: no course rules, IDs, progress or access.
export function serpentineStops(width: number, expanded: boolean[], startIndex = 0, fontScale = 1): MapStop[] {
  const scale = Math.max(1, Math.min(fontScale, 1.5));
  let top = 0;
  return expanded.map((large, index) => {
    const right = (startIndex + index) % 2 === 1;
    const size = large ? 96 : 80;
    const height = (large ? 208 : 154) * scale;
    const point = { x: width * (right ? .8 : .2), y: top + (large ? 82 : 53) * scale, top, height, size, right };
    top += height;
    return point;
  });
}

// Sample a cubic curve, then place short dashes at approximately equal distances.
export function curvedDashes(from: MapStop, to: MapStop) {
  const middle = (from.y + to.y) / 2;
  const result: (MapPoint & { angle: number })[] = [];
  let previous: MapPoint = from;
  let distance = 0;
  for (let i = 1; i <= 100; i++) {
    const t = i / 100, u = 1 - t;
    const x = u * u * u * from.x + 3 * u * u * t * from.x + 3 * u * t * t * to.x + t * t * t * to.x;
    const y = u * u * u * from.y + 3 * u * u * t * middle + 3 * u * t * t * middle + t * t * t * to.y;
    distance += Math.hypot(x - previous.x, y - previous.y);
    if (distance >= 13) {
      if (Math.hypot(x - from.x, y - from.y) > from.size / 2 + 5 && Math.hypot(x - to.x, y - to.y) > to.size / 2 + 5) {
        result.push({ x, y, angle: Math.atan2(y - previous.y, x - previous.x) * 180 / Math.PI });
      }
      distance = 0;
    }
    previous = { x, y };
  }
  return result;
}
