import { createHmac, randomBytes } from 'node:crypto';

/** Secret used for HMAC token generation. Random per process start. */
const TOKEN_SECRET = randomBytes(32).toString('hex');

/** Set of currently valid session tokens. */
const activeTokens = new Set<string>();

/** Panel password from environment variable. */
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || '';

/**
 * Returns true when panel authentication is enabled
 * (i.e. PANEL_PASSWORD env var is set and non-empty).
 */
export function isPanelAuthEnabled(): boolean {
  return PANEL_PASSWORD.length > 0;
}

/**
 * Validates the provided password against the configured PANEL_PASSWORD.
 * @param password - The password to check.
 * @returns true if the password matches.
 */
export function validatePassword(password: string): boolean {
  if (!PANEL_PASSWORD) return false;
  return password === PANEL_PASSWORD;
}

/**
 * Generates a new session token using HMAC of timestamp + random bytes.
 * The token is stored in the active tokens set.
 * @returns The generated token string.
 */
export function generateToken(): string {
  const payload = `${Date.now()}-${randomBytes(16).toString('hex')}`;
  const token = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  activeTokens.add(token);
  return token;
}

/**
 * Validates whether a token is currently active.
 * @param token - The token to validate.
 * @returns true if the token is in the active set.
 */
export function validateToken(token: string): boolean {
  return activeTokens.has(token);
}

/**
 * Removes a token from the active set (logout).
 * @param token - The token to revoke.
 */
export function revokeToken(token: string): void {
  activeTokens.delete(token);
}
