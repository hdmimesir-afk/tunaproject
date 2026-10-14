/**
 * Every number below is copied from the source proposal
 * "Proposal Pendanaan dan Proyeksi Laba Usaha Perikanan Bungus" (rev. 1 Oktober 2026, 18 halaman).
 * Page references use the proposal's own "Halaman" numbering.
 * Derived values are computed here (never typed by hand) so every slide stays consistent.
 */
export const SRC = {
  date: "1 Oktober 2026",
  capital: {
    plannedTotal: 5_007_013_680, // hlm. 1-2
    plannedInvestor: 4_276_849_128,
    plannedKatalis: 730_164_552,
    realizedTotal: 3_393_763_680,
    realizedInvestor: 3_181_849_128,
    realizedKatalis: 211_914_552,
    unrealizedTotal: 1_613_250_000,
    unrealizedInvestor: 1_095_000_000,
    unrealizedKatalis: 518_250_000,
  },
  split: { investor: 65, katalis: 35 }, // hlm. 3
  monthlyProfit: { pess: 275_005_556, mod: 475_675_000, opt: 734_532_223 }, // hlm. 1, 10
  investorShareMod: 309_188_750, // hlm. 3
  katalisShareMod: 166_486_250,
  fresh: {
    natural: { hpp: 120_000, price: 140_000, margin: 20_000 }, // hlm. 6
    co: { hpp: 90_000, price: 115_000, margin: 25_000 },
  },
  frozen: { hppMax: 70_000, priceLow: 83_000, priceHigh: 86_000 }, // hlm. 5
  dus: { buy: 45_000, material: 50_000, service: { loinCO: 9_400, loinNatural: 3_400, jawBelly: 3_000, redTrim: 2_500, darkMeat: 2_500 } }, // hlm. 9
  coldStorage: { perKgDay: 75, minDays: 10 }, // hlm. 8
  abf: { perKg: 3_500 },
  capacity: { fullDayKg: 3_000, saturdayKg: 1_333, hoursDUS: 27, hoursSNS: 22 }, // hlm. 4
  // Yield example, moderate scenario (hlm. 6)
  yield: { rawKg: 3_000, yieldPct: 50, naturalPct: 80 },
  // Contribution by line, moderate scenario, per month (hlm. 10)
  contribMod: {
    naturalFresh: 190_666_667,
    coFresh: 59_583_333,
    coFrozenSmall: 29_000_000,
    coldStorage: 40_500_000,
    abf: 25_000_000,
    dus: 149_175_000,
    total: 493_925_000,
    rent: 18_250_000,
  },
  // Working capital (hlm. 16-17)
  wc: {
    poolNow: 1_367_500_000,
    poolAfterKatalis: 1_867_500_000,
    needs: [
      { days: 7, need: 911_145_833, gapNow: 456_354_167, gapAfter: 956_354_167 },
      { days: 14, need: 1_572_791_667, gapNow: -205_291_667, gapAfter: 294_708_333 },
      { days: 21, need: 2_234_437_500, gapNow: -866_937_500, gapAfter: -366_937_500 },
    ],
  },
  // Sensitivity vs moderate (hlm. 17)
  sens: [
    { label: "Biaya daging segar naik Rp1.000/kg", drop: 11_916_667 },
    { label: "Harga jual ke PT SNS turun Rp5.000/kg", drop: 59_583_333 },
    { label: "Pemakaian mesin turun dari 75% ke 65%", drop: 53_256_667 },
    { label: "Sewa naik Rp5 juta per bulan", drop: 5_000_000 },
  ],
} as const;

export const TOTAL_SLIDES = 28;

// ---- Derived values (always computed) ----
export const derived = {
  realizedPct: (SRC.capital.realizedTotal / SRC.capital.plannedTotal) * 100,
  yieldOutKg: SRC.yield.rawKg * (SRC.yield.yieldPct / 100),
  naturalKg: SRC.yield.rawKg * (SRC.yield.yieldPct / 100) * (SRC.yield.naturalPct / 100),
  coKg: SRC.yield.rawKg * (SRC.yield.yieldPct / 100) * (1 - SRC.yield.naturalPct / 100),
};
