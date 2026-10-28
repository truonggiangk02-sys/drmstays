const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// HERE Routing v8 uses Flexible Polyline v1. Keep decoding on the server so
// the browser never receives a provider credential or provider-specific shape.
export function decodeHerePolyline(encoded: string): [number, number][] {
  if (!encoded || encoded.length > 100_000) throw new Error('Invalid route shape');
  let index = 0;
  const unsigned = () => {
    let value = 0, shift = 0;
    while (index < encoded.length) {
      const digit = alphabet.indexOf(encoded[index++]);
      if (digit < 0 || shift > 50) throw new Error('Invalid route shape');
      value += (digit & 31) * 2 ** shift;
      if (!(digit & 32)) return value;
      shift += 5;
    }
    throw new Error('Truncated route shape');
  };
  if (unsigned() !== 1) throw new Error('Unsupported route shape');
  const header = unsigned();
  const precision = header & 15;
  const thirdDimension = (header >> 4) & 7;
  if (precision > 10 || thirdDimension !== 0) throw new Error('Unsupported route dimensions');
  const factor = 10 ** precision;
  const signed = () => {
    const value = unsigned();
    return value & 1 ? -(value + 1) / 2 : value / 2;
  };
  const points: [number, number][] = [];
  let latitude = 0, longitude = 0;
  while (index < encoded.length) {
    if (points.length >= 10_000) throw new Error('Route shape too long');
    latitude += signed();
    longitude += signed();
    const lat = latitude / factor, lon = longitude / factor;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
      throw new Error('Invalid route coordinates');
    points.push([lat, lon]);
  }
  if (points.length < 2) throw new Error('Route shape too short');
  return points;
}
