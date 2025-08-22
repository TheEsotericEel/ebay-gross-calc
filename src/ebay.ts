// src/ebay.ts
/// <reference types="chrome"/>

import { getCredsDecrypted } from "./ebayAuth";

export type Env = "prod" | "sandbox";
type Creds = { accessToken: string; refreshToken?: string; env: Env };

const EBAY_BASE = {
  prod: "https://api.ebay.com",
  sandbox: "https://api.sandbox.ebay.com",
} as const;

async function getCreds(): Promise<Creds | null> {
  const c: any = await getCredsDecrypted();
  if (!c) return null;
  return { accessToken: c.access_token, refreshToken: c.refresh_token, env: c.env as Env };
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<any> {
  const creds = await getCreds();
  if (!creds) throw new Error("Not authenticated with eBay");
  const url = EBAY_BASE[creds.env] + path;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    const { refreshIfNeeded } = await import("./ebayAuth.js");
    await refreshIfNeeded();
    return apiFetch(path, init, false);
  }
  if (!res.ok) throw new Error(`eBay ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchRecentOrders(limit = 50) {
  return apiFetch(`/sell/fulfillment/v1/order?limit=${encodeURIComponent(String(limit))}`);
}

export async function fetchTransactions(params: Record<string, string | number> = {}) {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch(`/sell/finances/v1/transaction${q ? `?${q}` : ""}`);
}
