import { randomInt } from 'node:crypto';

import { OtpGenerator } from '../../domain/services/OtpGenerator.js';

export class SecureOtpGenerator implements OtpGenerator {
  generate(): string {
    return randomInt(100000, 1000000).toString();
  }
}