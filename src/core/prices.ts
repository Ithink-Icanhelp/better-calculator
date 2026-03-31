/**
 * Live crypto price service via CoinGecko free API.
 * 
 * Supports natural inputs like:
 *   "btc price"     → current BTC price in USD
 *   "eth price"     → current ETH price in USD  
 *   "sol in eur"    → SOL price in EUR
 * 
 * Includes a simple cache (30s TTL) to avoid hammering the API.
 * No API key required — uses the free /simple/price endpoint.
 */

export interface PriceResult {
  value: number;
  display: string;
  label: string;
}

// ─── Coin ID mapping (ticker → CoinGecko ID) ────────────────────────────────

const COIN_MAP: Record<string, string> = {
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  sol: 'solana',
  solana: 'solana',
  ada: 'cardano',
  cardano: 'cardano',
  dot: 'polkadot',
  polkadot: 'polkadot',
  matic: 'matic-network',
  polygon: 'matic-network',
  avax: 'avalanche-2',
  avalanche: 'avalanche-2',
  link: 'chainlink',
  chainlink: 'chainlink',
  doge: 'dogecoin',
  dogecoin: 'dogecoin',
  shib: 'shiba-inu',
  xrp: 'ripple',
  ripple: 'ripple',
  bnb: 'binancecoin',
  ltc: 'litecoin',
  litecoin: 'litecoin',
  uni: 'uniswap',
  uniswap: 'uniswap',
  atom: 'cosmos',
  cosmos: 'cosmos',
  near: 'near',
  apt: 'aptos',
  aptos: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
  sui: 'sui',
  ton: 'the-open-network',
  usdt: 'tether',
  usdc: 'usd-coin',
};

const CURRENCY_MAP: Record<string, string> = {
  usd: 'usd', dollar: 'usd', dollars: 'usd', '$': 'usd',
  eur: 'eur', euro: 'eur', euros: 'eur',
  gbp: 'gbp', pound: 'gbp', pounds: 'gbp',
  jpy: 'jpy', yen: 'jpy',
  cad: 'cad',
  aud: 'aud',
  chf: 'chf',
  cny: 'cny', yuan: 'cny',
  rub: 'rub', ruble: 'rub',
  try: 'try', lira: 'try',
  inr: 'inr', rupee: 'inr',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$', eur: '€', gbp: '£', jpy: '¥', cny: '¥',
  cad: 'C$', aud: 'A$', chf: 'CHF ', rub: '₽', try: '₺', inr: '₹',
};

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  price: number;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 30_000; // 30 seconds

// ─── Pattern matching ────────────────────────────────────────────────────────

const PRICE_PATTERNS = [
  // "btc price", "btc price in eur", "bitcoin price"
  /^(\w+)\s+price(?:\s+(?:in)\s+(\w+))?$/i,
  // "price of btc", "price of btc in eur"
  /^price\s+(?:of\s+)?(\w+)(?:\s+(?:in)\s+(\w+))?$/i,
  // "btc in eur", "eth in usd"
  /^(\w+)\s+in\s+(\w+)$/i,
  // "btc", "eth" — standalone ticker (only if it's a known coin)
  /^(\w+)$/i,
];

// ─── Portfolio pattern ───────────────────────────────────────────────────────
// "0.5 btc + 10 eth + 1000 usdc"
const PORTFOLIO_REGEX = /^([\d.]+)\s*(\w+)(?:\s*\+\s*([\d.]+)\s*(\w+))+$/i;
const PORTFOLIO_ITEM_REGEX = /([\d.]+)\s*(\w+)/gi;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Try to match a price lookup command.
 * Returns null synchronously if input doesn't look like a price query.
 * Returns a Promise<PriceResult> if it matches.
 */
export function tryPriceCommand(input: string): Promise<PriceResult> | null {
  const trimmed = input.trim().toLowerCase();

  // Check portfolio pattern first
  if (PORTFOLIO_REGEX.test(trimmed)) {
    return handlePortfolio(trimmed);
  }

  // Try each price pattern
  for (const pattern of PRICE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const coinTicker = match[1].toLowerCase();
      const currencyInput = match[2]?.toLowerCase();

      // Only match standalone tickers if they're known coins
      if (!match[2] && !COIN_MAP[coinTicker]) continue;

      // If the "currency" is actually a coin, this might be a conversion
      if (currencyInput && COIN_MAP[currencyInput] && !CURRENCY_MAP[currencyInput]) {
        return handleCoinToCoin(coinTicker, currencyInput);
      }

      const coinId = COIN_MAP[coinTicker];
      if (!coinId) continue;

      const currency = currencyInput ? (CURRENCY_MAP[currencyInput] || 'usd') : 'usd';
      return fetchPrice(coinId, currency).then((price) => {
        const symbol = CURRENCY_SYMBOLS[currency] || currency.toUpperCase() + ' ';
        return {
          value: price,
          display: `${coinTicker.toUpperCase()}: ${symbol}${fmtPrice(price)}`,
          label: `${coinTicker.toUpperCase()} Price`,
        };
      });
    }
  }

  return null;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCoinToCoin(fromTicker: string, toTicker: string): Promise<PriceResult> {
  const fromId = COIN_MAP[fromTicker];
  const toId = COIN_MAP[toTicker];
  if (!fromId || !toId) throw new Error(`Unknown coin: ${!fromId ? fromTicker : toTicker}`);

  const [fromPrice, toPrice] = await Promise.all([
    fetchPrice(fromId, 'usd'),
    fetchPrice(toId, 'usd'),
  ]);
  const ratio = fromPrice / toPrice;
  return {
    value: ratio,
    display: `1 ${fromTicker.toUpperCase()} = ${ratio.toFixed(6)} ${toTicker.toUpperCase()}`,
    label: `${fromTicker.toUpperCase()} → ${toTicker.toUpperCase()}`,
  };
}

async function handlePortfolio(input: string): Promise<PriceResult> {
  const items: Array<{ amount: number; ticker: string }> = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(PORTFOLIO_ITEM_REGEX.source, 'gi');

  while ((match = regex.exec(input)) !== null) {
    items.push({ amount: parseFloat(match[1]), ticker: match[2].toLowerCase() });
  }

  if (items.length === 0) throw new Error('No valid coins found');

  // Fetch all prices in parallel
  const coinIds = items.map((item) => {
    const id = COIN_MAP[item.ticker];
    if (!id) throw new Error(`Unknown coin: ${item.ticker}`);
    return id;
  });

  const uniqueIds = [...new Set(coinIds)];
  const prices = await fetchPricesBatch(uniqueIds, 'usd');

  let total = 0;
  const lines: string[] = [];
  for (const item of items) {
    const id = COIN_MAP[item.ticker];
    const price = prices[id];
    const value = item.amount * price;
    total += value;
    lines.push(`  ${item.amount} ${item.ticker.toUpperCase()} × $${fmtPrice(price)} = $${fmtPrice(value)}`);
  }

  return {
    value: total,
    display: [
      ...lines,
      `──────────`,
      `Total: $${fmtPrice(total)}`,
    ].join('\n'),
    label: 'Portfolio',
  };
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function fetchPrice(coinId: string, currency: string): Promise<number> {
  const cacheKey = `${coinId}-${currency}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Price fetch failed — try again');
  const data = await response.json();
  const price = data[coinId]?.[currency];
  if (price === undefined) throw new Error(`No price data for ${coinId}`);

  cache[cacheKey] = { price, timestamp: Date.now() };
  return price;
}

async function fetchPricesBatch(coinIds: string[], currency: string): Promise<Record<string, number>> {
  const ids = coinIds.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currency}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Price fetch failed — try again');
  const data = await response.json();

  const result: Record<string, number> = {};
  for (const id of coinIds) {
    const price = data[id]?.[currency];
    if (price === undefined) throw new Error(`No price data for ${id}`);
    result[id] = price;
    cache[`${id}-${currency}`] = { price, timestamp: Date.now() };
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // For small prices (like SHIB), show more decimals
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}
