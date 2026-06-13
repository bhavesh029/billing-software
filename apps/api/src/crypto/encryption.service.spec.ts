import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const keyB64 = Buffer.alloc(32, 7).toString('base64');

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = keyB64;
  });

  it('round-trips plaintext', () => {
    const svc = new EncryptionService();
    svc.onModuleInit();
    const secret = 'GSTIN09AAAAA0000A1Z5';
    const enc = svc.encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(svc.decrypt(enc)).toBe(secret);
  });

  it('rejects tampered ciphertext', () => {
    const svc = new EncryptionService();
    svc.onModuleInit();
    const enc = svc.encrypt('hello');
    const tampered = Buffer.from(enc, 'base64').toString('utf8');
    const obj = JSON.parse(tampered);
    obj.data = Buffer.from('ff', 'hex').toString('base64');
    const bad = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
    expect(() => svc.decrypt(bad)).toThrow();
  });
});
