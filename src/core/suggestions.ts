/**
 * Autocomplete suggestions engine.
 * 
 * As users type, this provides contextual suggestions so they
 * can discover features without reading documentation.
 * 
 * Suggestions are ranked by:
 * 1. How well they match the current input (prefix match)
 * 2. Category relevance
 * 3. Popularity/usefulness
 */

export interface Suggestion {
  /** What to fill into the input */
  text: string;
  /** Short human description shown alongside */
  description: string;
  /** Category for grouping */
  category: 'crypto' | 'convert' | 'math' | 'variable';
}

const ALL_SUGGESTIONS: Suggestion[] = [
  // ── Crypto Unit Conversions ──
  { text: '1 btc in sats', description: 'Convert BTC to Satoshis', category: 'convert' },
  { text: '50000 sats in btc', description: 'Convert Satoshis to BTC', category: 'convert' },
  { text: '1 eth in gwei', description: 'Convert ETH to Gwei', category: 'convert' },
  { text: '30 gwei in eth', description: 'Convert Gwei to ETH', category: 'convert' },
  { text: '1 eth in wei', description: 'Convert ETH to Wei', category: 'convert' },

  // ── Price Lookups ──
  { text: 'btc price', description: 'Live Bitcoin price', category: 'crypto' },
  { text: 'eth price', description: 'Live Ethereum price', category: 'crypto' },
  { text: 'sol price', description: 'Live Solana price', category: 'crypto' },
  { text: 'btc in eur', description: 'BTC price in Euros', category: 'crypto' },
  { text: 'eth in btc', description: 'ETH price in BTC', category: 'crypto' },

  // ── Portfolio ──
  { text: '0.5 btc + 10 eth + 1000 usdc', description: 'Portfolio total in USD', category: 'crypto' },

  // ── Profit/Loss ──
  { text: 'profit 1 btc 28000 67000', description: 'P/L: 1 BTC bought at $28k, now $67k', category: 'crypto' },
  { text: 'profit 10 eth 1800 3500', description: 'P/L: 10 ETH bought at $1.8k, now $3.5k', category: 'crypto' },

  // ── DCA ──
  { text: 'dca 100 52', description: 'DCA $100 for 52 periods', category: 'crypto' },
  { text: 'dca 500 12', description: 'DCA $500 for 12 periods', category: 'crypto' },

  // ── Gas ──
  { text: 'gas 21000 30', description: 'Gas cost: 21k units × 30 Gwei', category: 'crypto' },
  { text: 'gas 200000 50', description: 'Gas cost: 200k units × 50 Gwei', category: 'crypto' },

  // ── Staking ──
  { text: 'stake 10 eth 4.5 365', description: 'Yield: 10 ETH, 4.5% APY, 1 year', category: 'crypto' },
  { text: 'stake 32 eth 3.8 365', description: 'Yield: 32 ETH, 3.8% APY, 1 year', category: 'crypto' },

  // ── Impermanent Loss ──
  { text: 'il 1.5 1.0', description: 'IL: token A 1.5x, token B 1x', category: 'crypto' },
  { text: 'il 2.0 1.0', description: 'IL: token A 2x, token B 1x', category: 'crypto' },

  // ── Tax ──
  { text: 'tax 2000 3500 30', description: 'Tax on gain: buy $2k, sell $3.5k, 30%', category: 'crypto' },

  // ── Math Basics ──
  { text: '100 + 20%', description: 'Smart percent: 120', category: 'math' },
  { text: '100 - 15%', description: 'Smart percent: 85', category: 'math' },
  { text: 'sqrt(144)', description: 'Square root', category: 'math' },

  // ── Variables ──
  { text: 'price = 67000', description: 'Store a variable', category: 'variable' },
  { text: 'bags = 0.5', description: 'Store a variable', category: 'variable' },
];

/**
 * Get suggestions matching the current input.
 * Returns up to `limit` suggestions, sorted by relevance.
 */
export function getSuggestions(input: string, limit = 5): Suggestion[] {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return [];
  if (trimmed.length < 1) return [];

  // Score each suggestion by how well it matches
  const scored = ALL_SUGGESTIONS
    .map((s) => ({
      suggestion: s,
      score: scoreMatch(trimmed, s),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.suggestion);
}

function scoreMatch(input: string, suggestion: Suggestion): number {
  const text = suggestion.text.toLowerCase();
  const desc = suggestion.description.toLowerCase();

  // Exact prefix match on the suggestion text (highest score)
  if (text.startsWith(input)) return 100;

  // Input is a prefix of a word in the suggestion
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(input)) return 80;
  }

  // Input words all appear somewhere in text or description
  const inputWords = input.split(/\s+/);
  const allMatch = inputWords.every(
    (w) => text.includes(w) || desc.includes(w)
  );
  if (allMatch) return 60;

  // Partial match — any input word appears
  const anyMatch = inputWords.some(
    (w) => w.length >= 2 && (text.includes(w) || desc.includes(w))
  );
  if (anyMatch) return 30;

  return 0;
}

// ─── Rotating Placeholder Hints ──────────────────────────────────────────────
// These cycle in the input field to teach users what's possible.

export const PLACEHOLDER_HINTS = [
  'Try: 100 + 20%',
  'Try: btc price',
  'Try: 1 btc in sats',
  'Try: profit 1 btc 28000 67000',
  'Try: stake 10 eth 4.5 365',
  'Try: gas 21000 30',
  'Try: dca 100 52',
  'Try: 0.5 btc + 10 eth',
  'Try: tax 2000 3500 30',
  'Try: salary = 5000',
  'Try: il 2.0 1.0',
  'Try: eth in btc',
];

// ─── Cheat Sheet Data ────────────────────────────────────────────────────────
// Organized by category for the expandable help panel.

export interface CheatSheetCategory {
  title: string;
  icon: string;
  examples: Array<{ input: string; output: string }>;
}

export const CHEAT_SHEET: CheatSheetCategory[] = [
  {
    title: 'Prices',
    icon: '📈',
    examples: [
      { input: 'btc price', output: 'Live BTC in USD' },
      { input: 'eth in eur', output: 'ETH price in Euros' },
      { input: 'btc in eth', output: '1 BTC in ETH' },
    ],
  },
  {
    title: 'Portfolio',
    icon: '💼',
    examples: [
      { input: '0.5 btc + 10 eth + 1000 usdc', output: 'Total value in USD' },
    ],
  },
  {
    title: 'Convert',
    icon: '🔄',
    examples: [
      { input: '1 btc in sats', output: '100,000,000 sats' },
      { input: '50000 sats in btc', output: '0.0005 BTC' },
      { input: '1 eth in gwei', output: '1,000,000,000 Gwei' },
    ],
  },
  {
    title: 'Profit / Loss',
    icon: '💰',
    examples: [
      { input: 'profit 0.5 btc 28000 67000', output: 'P/L, ROI %' },
    ],
  },
  {
    title: 'Staking',
    icon: '🥩',
    examples: [
      { input: 'stake 10 eth 4.5 365', output: 'Yield over 1 year' },
    ],
  },
  {
    title: 'Gas Fees',
    icon: '⛽',
    examples: [
      { input: 'gas 21000 30', output: 'Cost in ETH' },
    ],
  },
  {
    title: 'DCA',
    icon: '📅',
    examples: [
      { input: 'dca 100 52', output: 'Total over 52 periods' },
    ],
  },
  {
    title: 'Tax',
    icon: '🧾',
    examples: [
      { input: 'tax 2000 3500 30', output: 'Net profit after tax' },
    ],
  },
  {
    title: 'IL Calculator',
    icon: '📉',
    examples: [
      { input: 'il 2.0 1.0', output: 'Impermanent loss %' },
    ],
  },
  {
    title: 'Math & Variables',
    icon: '🧮',
    examples: [
      { input: '100 + 20%', output: '120 (smart percent)' },
      { input: 'price = 67000', output: 'Save variable' },
      { input: 'price * 0.5', output: 'Use variable' },
    ],
  },
];
