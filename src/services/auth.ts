import { createHmac, randomBytes } from 'node:crypto';

/** Secret used for HMAC token generation. Random per process start. */
const TOKEN_SECRET = randomBytes(32).toString('hex');

/** Token expiration time in milliseconds (30 minutes). */
const TOKEN_TTL_MS = 30 * 60 * 1000;

/** Map of active tokens to their creation timestamp. */
const activeTokens = new Map<string, number>();

/**
 * Returns the panel password, read lazily so dotenv has time to load.
 */
function getPanelPassword(): string {
  return process.env.PANEL_PASSWORD || '';
}

/**
 * Returns true when panel authentication is enabled
 * (i.e. PANEL_PASSWORD env var is set and non-empty).
 */
export function isPanelAuthEnabled(): boolean {
  return getPanelPassword().length > 0;
}

/**
 * Validates the provided password against the configured PANEL_PASSWORD.
 * @param password - The password to check.
 * @returns true if the password matches.
 */
export function validatePassword(password: string): boolean {
  const pw = getPanelPassword();
  if (!pw) return false;
  return password === pw;
}

/**
 * Generates a new session token using HMAC of timestamp + random bytes.
 * The token is stored with a creation timestamp for expiration.
 * @returns The generated token string.
 */
export function generateToken(): string {
  const payload = `${Date.now()}-${randomBytes(16).toString('hex')}`;
  const token = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  activeTokens.set(token, Date.now());
  return token;
}

/**
 * Validates whether a token is currently active and not expired.
 * Expired tokens are automatically removed.
 * @param token - The token to validate.
 * @returns true if the token is valid and not expired.
 */
export function validateToken(token: string): boolean {
  const createdAt = activeTokens.get(token);
  if (createdAt === undefined) return false;

  if (Date.now() - createdAt > TOKEN_TTL_MS) {
    activeTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Removes a token from the active set (logout).
 * @param token - The token to revoke.
 */
export function revokeToken(token: string): void {
  activeTokens.delete(token);
}
