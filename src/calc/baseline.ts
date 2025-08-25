// FILE: src/calc/baseline.ts  (new)
export type DayKey = `${string}-${string}-${string}`;
export type RollupDaily = {
  key: string;              // `${accountId}|${date}`
  accountId: string;
  date: DayKey;             // yyyy-mm-dd (store timezone-normalized)
  unitsSold: number;
  grossExTax: number;       // item + shipping, exclude buyer tax
  fees: number;             // FVF + processing + regulatory
  ads: number;              // Promoted Listings fees
  labels: number;           // eBay shipping label spend
  refunds: number;          // refunds to buyer (item+ship)
  listedValueNew: number;   // pipeline new listings value
};

export type BaselineOpts = {
  windowDays: 7|30|90|180|365;
  denom: "calendar"|"active";
};

export type Baseline = {
  feeRate:number; adRate:number; labelRate:number; refundRate:number;
  asp:number; salesPerDay:number; unitsPerDay:number; netPerDay:number;
};

export function computeBaseline(rows: RollupDaily[], opts: BaselineOpts): Baseline {
  const uniqDays = new Set(rows.map(r=>r.date));
  const daysDen = opts.denom==="active" ? Math.max(1, uniqDays.size) : opts.windowDays;
  const sum = <K extends keyof RollupDaily>(k: K)=> rows.reduce((s,r)=>s+Number(r[k]||0),0);
  const gross = sum("grossExTax");
  const units = sum("unitsSold");
  const fees = sum("fees"), ads = sum("ads"), labels = sum("labels"), refunds = sum("refunds");
  const net = gross - fees - ads - labels - refunds;
  return {
    feeRate: gross ? fees/gross : 0,
    adRate:  gross ? ads/gross  : 0,
    labelRate: gross ? labels/gross : 0,
    refundRate: gross ? refunds/gross : 0,
    asp: units ? gross/units : 0,
    salesPerDay: gross / daysDen,
    unitsPerDay: units / daysDen,
    netPerDay: net / daysDen,
  };
}

export function computeBaselinesForPresets(rows: RollupDaily[], nowISO: string, denom: BaselineOpts["denom"]) {
  const now = new Date(nowISO).getTime();
  const presets = [7,30,90,180,365] as const;
  const byWindow = Object.fromEntries(presets.map(d => {
    const start = now - d*24*3600*1000;
    const slice = rows.filter(r => new Date(r.date+"T00:00:00Z").getTime() >= start);
    return [d, computeBaseline(slice, { windowDays: d, denom })];
  }));
  return byWindow;
}
