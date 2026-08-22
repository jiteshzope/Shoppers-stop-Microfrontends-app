import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let passwords: PasswordService;

  beforeAll(async () => {
    passwords = new PasswordService();
    await passwords.onModuleInit();
  });

  it('produces an argon2id digest that verifies against the original password', async () => {
    const digest = await passwords.hash('Sh0pperPass');

    expect(digest.startsWith('$argon2id$')).toBe(true);
    await expect(passwords.verify(digest, 'Sh0pperPass')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const digest = await passwords.hash('Sh0pperPass');
    await expect(passwords.verify(digest, 'Sh0pperPas')).resolves.toBe(false);
  });

  it('salts each hash, so the same password never yields the same digest twice', async () => {
    const [first, second] = await Promise.all([
      passwords.hash('Sh0pperPass'),
      passwords.hash('Sh0pperPass'),
    ]);

    expect(first).not.toEqual(second);
  });

  it('treats a malformed digest as a non-match rather than throwing', async () => {
    await expect(passwords.verify('not-a-digest', 'Sh0pperPass')).resolves.toBe(false);
    expect(passwords.needsRehash('not-a-digest')).toBe(true);
  });

  it('does not ask for a rehash of a digest built with the current parameters', async () => {
    expect(passwords.needsRehash(await passwords.hash('Sh0pperPass'))).toBe(false);
  });
});
