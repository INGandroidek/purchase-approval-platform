import { randomBytes } from 'node:crypto';

import { TokenGenerator } from '../../domain/services/TokenGenerator.js';

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(32).toString('hex');
  }
}