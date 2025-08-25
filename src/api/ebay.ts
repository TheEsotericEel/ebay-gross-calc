// FILE: src/api/ebay.ts  (new; lightweight fetchers; replace endpoints as you finalize scopes)
import { ensureAccessToken } from "../auth/ebay-oauth.js";

export type TimeWin = { startISO: string; endISO: string; };
export type OrderRow   = { id:string; paidISO:string; itemGross:number; shipGross:number; tax:number; };
export type FinanceRow = { dateISO:string; kind:"FVF"|"PROC"|"REG"|"LABEL"|"REFUND"; amount:number; orderId?:string; };
export type AdRow      = { dateISO:string; amount:number; };
export type ListingRow = { id:string; createdISO:string; listPrice:number; qty:number; };

const API = {
  fulfillBase: "https://api.ebay.com/sell/fulfillment/v1",
  financesBase:"https://api.ebay.com/sell/finances/v1",
  marketingRpt:"https://api.ebay.com/sell/marketing/v1",
  inventory:   "https://api.ebay.com/sell/inventory/v1",
};

async function ebayGET<T>(url: string): Promise<T> {
  const token = await ensureAccessToken();
  const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}`, "Content-Type":"application/json" }});
  if (!res.ok) throw new Error(`EBAY_HTTP_${res.status}`);
  return res.json() as Promise<T>;
}

// Orders: API YES. Map to minimal fields. Filter by paid date range.
export async function getOrders(win: TimeWin): Promise<OrderRow[]> {
  // NOTE: Replace filter with your preferred criteria. Pagination omitted here for brevity.
  const qp = new URLSearchParams({
    filter: `paymentDate:[${win.startISO}..${win.endISO}]`,
    limit: "200",
    fieldGroups: "TAX_BREAKDOWN"
  });
  const url = `${API.fulfillBase}/order?${qp.toString()}`;
  const data:any = await ebayGET<any>(url);
  const out: OrderRow[] = [];
  for (const o of (data?.orders ?? [])) {
    const paidISO = o?.paymentSummary?.payments?.[0]?.paymentDate || o?.creationDate;
    const itemGross = Number(o?.pricingSummary?.priceSubtotal?.value ?? 0);
    const shipping  = Number(o?.pricingSummary?.deliveryCost?.value ?? 0);
    const tax       = Number(o?.pricingSummary?.tax?.value ?? 0);
    out.push({ id:o.orderId, paidISO, itemGross, shipGross: shipping, tax });
  }
  return out;
}

// Finances: API YES. Pull transactions and bin by type.
export async function getFinances(win: TimeWin): Promise<FinanceRow[]> {
  const qp = new URLSearchParams({ filter: `transactionDate:[${win.startISO}..${win.endISO}]`, limit:"200" });
  const url = `${API.financesBase}/transaction?${qp.toString()}`;
  const data:any = await ebayGET<any>(url);
  const out: FinanceRow[] = [];
  for (const t of (data?.transactions ?? [])) {
    const dateISO = t?.transactionDate;
    const amt = Number(t?.amount?.value ?? 0);
    const type = String(t?.transactionType ?? "");
    let kind: FinanceRow["kind"]|null = null;
    if (type.includes("FEE")) kind = "FVF";
    if (type.includes("TRANSFER")) kind = "PROC";
    if (type.includes("REGULATORY")) kind = "REG";
    if (type.includes("SHIPPING_LABEL")) kind = "LABEL";
    if (type.includes("REFUND")) kind = "REFUND";
    if (!kind) continue;
    out.push({ dateISO, kind, amount: amt, orderId: t?.orderId });
  }
  return out;
}

// Ads fees: API YES via reports. Here return empty and mark TODO.
export async function getAds(_win: TimeWin): Promise<AdRow[]> {
  // TODO: Implement report create → poll → download → parse.
  return [];
}

// New listings value: API YES via Inventory or Listings. Keep minimal using inventory.
export async function getNewListings(win: TimeWin): Promise<ListingRow[]> {
  // Many sellers have large catalogs; pagination required. Here we return empty to avoid quota issues until wired.
  // TODO: Implement search by creationDate if available, else pull pages and filter client-side.
  return [];
}
