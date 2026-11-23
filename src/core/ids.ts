import { randomBytes } from 'crypto';

/** RFC 9562 UUID version 7 (time-ordered). */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const time = Date.now();
  bytes[0] = Math.floor(time / 1099511627776) & 0xff;
  bytes[1] = Math.floor(time / 4294967296) & 0xff;
  bytes[2] = Math.floor(time / 16777216) & 0xff;
  bytes[3] = Math.floor(time / 65536) & 0xff;
  bytes[4] = Math.floor(time / 256) & 0xff;
  bytes[5] = time & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
