const {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateUploadToken,
  uploadTokenExpiry,
} = require('../../src/utils/tokens');

describe('token utils', () => {
  const fakeAdmin = { id: 'admin-1', role: 'SUBADMIN', email: 'sub@example.com' };

  test('signAccessToken produces a token that verifyAccessToken can decode with matching claims', () => {
    const token = signAccessToken(fakeAdmin);
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe(fakeAdmin.id);
    expect(payload.role).toBe(fakeAdmin.role);
    expect(payload.email).toBe(fakeAdmin.email);
  });

  test('verifyAccessToken throws on a tampered/invalid token', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow();
  });

  test('generateRefreshToken returns a long random hex string, unique per call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();

    expect(a).toMatch(/^[a-f0-9]+$/);
    expect(a.length).toBeGreaterThanOrEqual(64);
    expect(a).not.toBe(b);
  });

  test('hashToken is deterministic and never returns the original value', () => {
    const raw = 'some-refresh-token-value';
    const hashedOnce = hashToken(raw);
    const hashedTwice = hashToken(raw);

    expect(hashedOnce).toBe(hashedTwice);
    expect(hashedOnce).not.toBe(raw);
  });

  test('generateUploadToken returns a unique token distinct from hashToken output', () => {
    const t1 = generateUploadToken();
    const t2 = generateUploadToken();
    expect(t1).not.toBe(t2);
    expect(hashToken(t1)).not.toBe(t1);
  });

  test('uploadTokenExpiry returns a date roughly 60 days in the future', () => {
    const expiry = uploadTokenExpiry();
    const days = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(59);
    expect(days).toBeLessThan(61);
  });
});
