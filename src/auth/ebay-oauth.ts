// FILE: src/auth/ebay-oauth.ts  (new; stub; requires tiny backend)
export type TokenBundle = { access_token: string; expires_at: number; refresh_token?: string; refresh_expires_at?: number; };

export async function ensureAccessToken(): Promise<string> {
  // TODO: Implement real OAuth. For now, read a manually stored token.
  const { ebayToken = null } = await chrome.storage.session.get(["ebayToken"]);
  if (!ebayToken) throw new Error("NO_EBAY_TOKEN");
  return ebayToken as string;
}
// Optional helper to set token manually during development
export async function __devSetToken(t: string) {
  await chrome.storage.session.set({ ebayToken: t });
}
