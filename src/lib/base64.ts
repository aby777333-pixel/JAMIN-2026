/** Decode a base64 string → bytes (RN has no atob/Buffer; avoids a base64 dep). */
export function base64ToBytes(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let len = b64.length * 0.75;
  if (b64[b64.length - 1] === '=') {
    len--;
    if (b64[b64.length - 2] === '=') len--;
  }
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)];
    const e2 = lookup[b64.charCodeAt(i + 1)];
    const e3 = lookup[b64.charCodeAt(i + 2)];
    const e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (b64[i + 2] !== '=') bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (b64[i + 3] !== '=') bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}
