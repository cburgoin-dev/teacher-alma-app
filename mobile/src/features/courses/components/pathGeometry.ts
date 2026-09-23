export type MapPoint = { x: number; y: number };
export type MapStop = MapPoint & { top: number; height: number; size: number; right: boolean };

// Section markers add room inside a single global coordinate system.
// Neither ordering nor learning/access states are decided here.
export function courseStops(width: number, expanded: boolean[], sectionStarts: boolean[], fontScale = 1): MapStop[] {
  const scale = Math.max(1, Math.min(fontScale, 1.5));
  let shift = 0;
  return serpentineStops(width, expanded, 0, fontScale).map((stop, index) => {
    const lead = sectionStarts[index] ? 84 * scale : 0;
    const result = { ...stop, top: stop.top + shift, y: stop.y + shift + lead, height: stop.height + lead };
    shift += lead;
    // Leave room for the current card, but no full empty stop after the last lesson.
    if (index === expanded.length - 1) result.height = result.y - result.top + (expanded[index] ? 100 * scale : 60 * scale);
    return result;
  });
}

// Only viewport/presentation inputs: no course rules, IDs, progress or access.
export function serpentineStops(width: number, expanded: boolean[], startIndex = 0, fontScale = 1): MapStop[] {
  const scale = Math.max(1, Math.min(fontScale, 1.5));
  let top = 0;
  return expanded.map((large, index) => {
    const right = (startIndex + index) % 2 === 1;
    const size = large ? 96 : 80;
    const height = (large ? 198 : 144) * scale;
    const point = { x: width * (right ? .8 : .2), y: top + (large ? 82 : 53) * scale, top, height, size, right };
    top += height;
    return point;
  });
}

// Sample a cubic curve, then place short dashes at approximately equal distances.
export function curvedDashes(from: MapStop, to: MapStop, sectionTransition = false): (MapPoint & { angle: number })[] {
  // Finish the lateral turn before the new section; descend beside its text.
  if (sectionTransition) {
    const approach = { ...to, y: to.top - 16, size: 0 };
    const dots = curvedDashes(from, approach);
    const end = to.y - to.size / 2 - 5;
    const direction = to.right ? 1 : -1;
    for (let y = approach.y + 7; y < end; y += 13) {
      const t = (y - approach.y) / (end - approach.y);
      const dx = direction * 10 * Math.PI * Math.cos(Math.PI * t) / (end - approach.y);
      dots.push({ x: to.x + direction * 10 * Math.sin(Math.PI * t), y, angle: Math.atan2(1, dx) * 180 / Math.PI });
    }
    return dots;
  }
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
