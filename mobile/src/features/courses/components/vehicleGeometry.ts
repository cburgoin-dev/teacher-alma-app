// RouteBus: 60x50 SVG fitted inside 44x42 (xMidYMid meet).
// Average tire contact: ((15 + 46) / 2, 42 + 6), not the viewport bottom.
const scale = 44 / 60;
export const vehicleContact = { x: 30.5 * scale, y: (42 - 50 * scale) / 2 + 48 * scale };
// Numeric tuple bypasses RN 0.86 string parser, which drops decimal prefixes.
export const vehicleOrigin: [number, number, number] = [vehicleContact.x, vehicleContact.y, 0];
export const vehiclePosition = (point: { x: number; y: number }) => ({ x: point.x - vehicleContact.x, y: point.y - vehicleContact.y });
// V5 samples measure from the downward marker axis. A side-on bus needs
// its wheel baseline along the tangent. Choose facing once per connector.
export const vehicleAngle = (sampleAngle: number, facingLeft: boolean) => sampleAngle + 90 - (facingLeft ? 180 : 0);
