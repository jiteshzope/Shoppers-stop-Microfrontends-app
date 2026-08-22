import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

/**
 * Argon2id parameters.
 *
 * Argon2id is the variant OWASP recommends for password storage: it inherits
 * Argon2i's side-channel resistance on the first pass and Argon2d's resistance
 * to time-memory trade-offs on the rest. 19 MiB of memory over two passes is
 * the OWASP baseline and is comfortable on a small Railway instance.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService implements OnModuleInit {
  /**
   * Digest of a random value nobody knows, verified against when the account
   * does not exist. It costs the same as verifying a real password, so a
   * missing account and a wrong password take a comparable amount of time and
   * cannot be told apart by timing alone. Built at boot rather than hard-coded
   * so it always matches the parameters above.
   */
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(32).toString('hex'));
  }

  hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, ARGON2_OPTIONS);
  }

  async verify(digest: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(digest, plaintext);
    } catch {
      // A malformed or truncated digest is a data problem, not a match.
      return false;
    }
  }

  /** Burns roughly one verification's worth of time for an unknown account. */
  async verifyDummy(plaintext: string): Promise<void> {
    if (this.dummyHash) {
      await this.verify(this.dummyHash, plaintext);
    }
  }

  /**
   * True when a stored digest was produced with weaker parameters than the ones
   * above, so the caller can transparently re-hash on the next successful login.
   */
  needsRehash(digest: string): boolean {
    try {
      return argon2.needsRehash(digest, ARGON2_OPTIONS);
    } catch {
      return true;
    }
  }
}
