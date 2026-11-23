import bcrypt from 'bcryptjs';

import { EncryptionUtil } from './utils/encryption.util';

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/** New passwords are bcrypt. Rows written before this change stay reversible AES. */
export async function passwordMatches(plain: string, stored: string, legacy: EncryptionUtil): Promise<boolean> {
  if (stored.startsWith('$2')) return bcrypt.compare(plain, stored);
  try {
    return plain === legacy.decrypt(stored);
  } catch {
    return false;
  }
}
