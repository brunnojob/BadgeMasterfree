import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
export function seal(value, secret) {
  if (!secret || secret.length < 32) throw new Error('Server session key is not configured');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function unseal(value, secret, kind, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 12000) throw new Error('Invalid session');
  if (!secret || secret.length < 32) throw new Error('Server session key is not configured');
  const data = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), data.subarray(0,12));
  decipher.setAuthTag(data.subarray(12,28));
  const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
  if (result.kind !== kind || !Number.isFinite(result.exp) || result.exp <= now) throw new Error('Session expired');
  return result;
}
export const random = () => randomBytes(32).toString('base64url');
export const challenge = value => createHash('sha256').update(value).digest('base64url');
export function targetPath(action, target) {
  const login = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})';
  if (action === 'star' && new RegExp(`^${login}/[a-zA-Z0-9_.-]{1,100}$`).test(target)) {
    const [owner, repo] = target.split('/');
    if (repo === '.' || repo === '..') throw new Error('Invalid repository');
    return `/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }
  if (action === 'follow' && new RegExp(`^${login}$`).test(target)) return `/user/following/${target}`;
  throw new Error('Invalid action or target');
}
