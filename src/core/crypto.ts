/**
 * Crypto-specific calculation commands.
 * 
 * All commands are parsed from natural language input.
 * Users don't need to memorize syntax — they just type what they mean:
 * 
 *   "1.5 btc in sats"         → unit conversion
 *   "profit 0.5 btc 28000 67000" → P/L calculator
 *   "stake 10 eth 4.5% 365"   → staking yield
 *   "dca 100 52"               → DCA calculator
 *   "gas 21000 30"             → gas fee estimator
 *   "tax 2000 3500 30%"        → tax helper
 *   "il 1.5 2.0"               → impermanent loss
 * 
 * Each handler returns a CryptoResult with a friendly, multi-line
 * display string so users immediately understand the output.
 */

export interface CryptoResult {
  /** Primary numeric value (for reuse in further calculations) */
  value: number;
  /** Human-friendly multi-line display string */
  display: string;
  /** Short label describing what was calculated */
  label: string;
}

// ─── Unit Conversion Constants ───────────────────────────────────────────────

const SATS_PER_BTC = 1e8;
const GWEI_PER_ETH = 1e9;
const WEI_PER_ETH = 1e18;

// ─── Pattern Matchers ────────────────────────────────────────────────────────
// Each pattern is designed to be forgiving — order of words is flexible,
// keywords trigger the right handler, and numbers are extracted positionally.

const PATTERNS: Array<{
  regex: RegExp;
  handler: (match: RegExpMatchArray) => CryptoResult | null;
}> = [
  // ── Unit conversions ──
  // "1.5 btc in sats", "1.5 btc to sats", "1.5 btc sats"
  {
    regex: /^([\d.]+)\s*btc\s+(?:in|to)\s+sats?$/i,
    handler: (m) => {
      const btc = parseFloat(m[1]);
      const sats = btc * SATS_PER_BTC;
      return { value: sats, display: `${btc} BTC = ${fmt(sats)} sats`, label: 'BTC → Sats' };
    },
  },
  {
    regex: /^([\d,]+)\s*sats?\s+(?:in|to)\s+btc$/i,
    handler: (m) => {
      const sats = parseFloat(m[1].replace(/,/g, ''));
      const btc = sats / SATS_PER_BTC;
      return { value: btc, display: `${fmt(sats)} sats = ${btc.toFixed(8)} BTC`, label: 'Sats → BTC' };
    },
  },
  {
    regex: /^([\d.]+)\s*eth\s+(?:in|to)\s+gwei$/i,
    handler: (m) => {
      const eth = parseFloat(m[1]);
      const gwei = eth * GWEI_PER_ETH;
      return { value: gwei, display: `${eth} ETH = ${fmt(gwei)} Gwei`, label: 'ETH → Gwei' };
    },
  },
  {
    regex: /^([\d,.]+)\s*gwei\s+(?:in|to)\s+eth$/i,
    handler: (m) => {
      const gwei = parseFloat(m[1].replace(/,/g, ''));
      const eth = gwei / GWEI_PER_ETH;
      return { value: eth, display: `${fmt(gwei)} Gwei = ${eth.toFixed(9)} ETH`, label: 'Gwei → ETH' };
    },
  },
  {
    regex: /^([\d.]+)\s*eth\s+(?:in|to)\s+wei$/i,
    handler: (m) => {
      const eth = parseFloat(m[1]);
      const wei = eth * WEI_PER_ETH;
      return { value: wei, display: `${eth} ETH = ${wei.toExponential(2)} Wei`, label: 'ETH → Wei' };
    },
  },

  // ── Profit/Loss ──
  // "profit 0.5 btc 28000 67000" → bought amount at buyPrice, now at sellPrice
  // "profit 0.5 28000 67000"
  // "pnl 0.5 btc bought 28000 now 67000"
  {
    regex: /^(?:profit|pnl|pl)\s+([\d.]+)\s*(?:btc|eth|sol|ada|dot|matic)?\s*(?:bought\s+(?:at\s+)?)?(\d[\d,.]*)\s*(?:now\s+(?:at\s+)?|sold\s+(?:at\s+)?)?(\d[\d,.]*)$/i,
    handler: (m) => {
      const amount = parseFloat(m[1]);
      const buyPrice = parseFloat(m[2].replace(/,/g, ''));
      const sellPrice = parseFloat(m[3].replace(/,/g, ''));
      const invested = amount * buyPrice;
      const current = amount * sellPrice;
      const profitLoss = current - invested;
      const pctChange = ((sellPrice - buyPrice) / buyPrice) * 100;
      const sign = profitLoss >= 0 ? '+' : '';
      return {
        value: profitLoss,
        display: [
          `Invested: $${fmt(invested)}`,
          `Current:  $${fmt(current)}`,
          `P/L:      ${sign}$${fmt(profitLoss)} (${sign}${pctChange.toFixed(2)}%)`,
          `ROI:      ${pctChange.toFixed(2)}%`,
        ].join('\n'),
        label: profitLoss >= 0 ? 'Profit' : 'Loss',
      };
    },
  },

  // ── DCA Calculator ──
  // "dca 100 52" → $100/week for 52 weeks
  // "dca 100 weekly 52 weeks"
  // "dca 500 monthly 12"
  {
    regex: /^dca\s+\$?([\d,.]+)\s*(?:\/?\s*(?:week(?:ly)?|month(?:ly)?|day|daily))?\s*(?:for\s+)?(\d+)\s*(?:weeks?|months?|days?)?$/i,
    handler: (m) => {
      const amount = parseFloat(m[1].replace(/,/g, ''));
      const periods = parseInt(m[2]);
      const totalInvested = amount * periods;
      const avgNote = 'Average cost depends on price at each buy';
      return {
        value: totalInvested,
        display: [
          `Amount per period: $${fmt(amount)}`,
          `Periods: ${periods}`,
          `Total invested: $${fmt(totalInvested)}`,
          avgNote,
        ].join('\n'),
        label: 'DCA',
      };
    },
  },

  // ── Gas Fee Calculator ──
  // "gas 21000 30" → 21000 gas units * 30 gwei
  // "gas 21000 * 30 gwei"
  {
    regex: /^gas\s+([\d,]+)\s*\*?\s*([\d.]+)\s*(?:gwei)?$/i,
    handler: (m) => {
      const gasUnits = parseFloat(m[1].replace(/,/g, ''));
      const gweiPrice = parseFloat(m[2]);
      const costEth = (gasUnits * gweiPrice) / GWEI_PER_ETH;
      return {
        value: costEth,
        display: [
          `Gas: ${fmt(gasUnits)} units × ${gweiPrice} Gwei`,
          `Cost: ${costEth.toFixed(6)} ETH`,
        ].join('\n'),
        label: 'Gas Fee',
      };
    },
  },

  // ── Staking / Yield Calculator ──
  // "stake 10 eth 4.5% 365" → 10 ETH at 4.5% APY for 365 days
  // "yield 10 4.5 365"
  // "stake 10 4.5% 365 days"
  {
    regex: /^(?:stake|staking|yield|apy)\s+([\d.]+)\s*(?:eth|btc|sol|ada|dot|matic)?\s*([\d.]+)\s*%?\s*(?:apy\s+)?(?:for\s+)?([\d]+)\s*(?:days?)?$/i,
    handler: (m) => {
      const principal = parseFloat(m[1]);
      const apyPct = parseFloat(m[2]);
      const days = parseInt(m[3]);
      const apy = apyPct / 100;
      // Compound daily: A = P * (1 + r/365)^days
      const finalAmount = principal * Math.pow(1 + apy / 365, days);
      const earned = finalAmount - principal;
      const dailyYield = earned / days;
      return {
        value: earned,
        display: [
          `Principal: ${principal}`,
          `APY: ${apyPct}% for ${days} days`,
          `Earned: ${earned.toFixed(6)}`,
          `Final: ${finalAmount.toFixed(6)}`,
          `Daily avg: ~${dailyYield.toFixed(6)}`,
        ].join('\n'),
        label: 'Staking Yield',
      };
    },
  },

  // ── Impermanent Loss Calculator ──
  // "il 1.5 2.0" → price ratio changed from 1 to 1.5 and 1 to 2.0
  // "il 150%" → price of one asset moved 150%
  {
    regex: /^(?:il|impermanent)\s+([\d.]+)\s+([\d.]+)$/i,
    handler: (m) => {
      const r1 = parseFloat(m[1]); // price ratio of token A (new/old)
      const r2 = parseFloat(m[2]); // price ratio of token B (new/old)
      // IL formula: IL = 2*sqrt(r)/(1+r) - 1 where r = priceRatioA/priceRatioB
      const r = r1 / r2;
      const il = 2 * Math.sqrt(r) / (1 + r) - 1;
      const ilPct = il * 100;
      // Value if held vs LP
      const holdValue = (r1 + r2) / 2;
      const lpValue = Math.sqrt(r1 * r2);
      return {
        value: ilPct,
        display: [
          `Price ratio A: ${r1}x, B: ${r2}x`,
          `Impermanent Loss: ${ilPct.toFixed(4)}%`,
          `Hold value: ${holdValue.toFixed(4)} (normalized)`,
          `LP value:   ${lpValue.toFixed(4)} (normalized)`,
        ].join('\n'),
        label: 'Impermanent Loss',
      };
    },
  },

  // ── Tax Helper ──
  // "tax 2000 3500 30%" → bought at 2000, sold at 3500, 30% tax rate
  // "tax 2000 3500 30"
  {
    regex: /^tax\s+([\d,.]+)\s+([\d,.]+)\s+([\d.]+)\s*%?$/i,
    handler: (m) => {
      const buyPrice = parseFloat(m[1].replace(/,/g, ''));
      const sellPrice = parseFloat(m[2].replace(/,/g, ''));
      const taxRate = parseFloat(m[3]) / 100;
      const gain = sellPrice - buyPrice;
      const taxOwed = Math.max(0, gain * taxRate);
      const netProfit = gain - taxOwed;
      return {
        value: netProfit,
        display: [
          `Buy: $${fmt(buyPrice)} → Sell: $${fmt(sellPrice)}`,
          `Gain: $${fmt(gain)}`,
          `Tax (${(taxRate * 100).toFixed(0)}%): $${fmt(taxOwed)}`,
          `Net profit: $${fmt(netProfit)}`,
        ].join('\n'),
        label: 'Tax',
      };
    },
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Try to match input against all crypto command patterns.
 * Returns null if input doesn't match any crypto command,
 * allowing fallback to the standard math engine.
 */
export function tryCryptoCommand(input: string): CryptoResult | null {
  const trimmed = input.trim();
  for (const { regex, handler } of PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      return handler(match);
    }
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format number with commas */
function fmt(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString('en-US');
  }
  // Keep up to 6 decimal places for crypto amounts
  const parts = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '').split('.');
  parts[0] = parseInt(parts[0]).toLocaleString('en-US');
  return parts.join('.');
}
