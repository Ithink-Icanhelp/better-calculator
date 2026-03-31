# Better Calculator

A keyboard-first calculator with built-in crypto tools. Type natural language commands to convert units, check live prices, calculate profit/loss, staking yields, gas fees, and more.

![Dark mode UI](https://img.shields.io/badge/theme-dark%20mode-1c1c20) ![No API key](https://img.shields.io/badge/API%20key-not%20required-4ade80) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Quick Start

```bash
git clone https://github.com/Ithink-Icanhelp/better-calculator.git
cd better-calculator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

### Math
| Input | Output |
|---|---|
| `100 + 20%` | `120` (smart percent) |
| `sqrt(144)` | `12` |
| `salary = 3000` | stores variable |
| `salary * 12` | `36000` (uses variable) |

### Crypto Unit Conversion
| Input | Output |
|---|---|
| `1 btc in sats` | `100,000,000 sats` |
| `50000 sats in btc` | `0.0005 BTC` |
| `1 eth in gwei` | `1,000,000,000 Gwei` |
| `1 eth in wei` | `1.00e+18 Wei` |

### Live Prices (via CoinGecko — no API key needed)
| Input | Output |
|---|---|
| `btc price` | Live BTC price in USD |
| `eth in eur` | ETH price in Euros |
| `btc in eth` | BTC/ETH ratio |
| `0.5 btc + 10 eth + 1000 usdc` | Portfolio total in USD |

### Profit / Loss
| Input | Output |
|---|---|
| `profit 1 btc 28000 67000` | P/L, ROI %, invested vs current |

### Staking Yield
| Input | Output |
|---|---|
| `stake 10 eth 4.5 365` | Earned, final amount, daily avg |

### Gas Fees
| Input | Output |
|---|---|
| `gas 21000 30` | Cost in ETH (21k units × 30 Gwei) |

### DCA Calculator
| Input | Output |
|---|---|
| `dca 100 52` | Total invested over 52 periods |

### Tax Helper
| Input | Output |
|---|---|
| `tax 2000 3500 30` | Gain, tax owed, net profit |

### Impermanent Loss
| Input | Output |
|---|---|
| `il 2.0 1.0` | IL %, hold vs LP value |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Submit expression |
| `Esc` | Clear input |
| `⌘K` / `Ctrl+K` | Reset everything |
| `⌘L` / `Ctrl+L` | Clear history |
| `⌘/` / `Ctrl+/` | Toggle cheat sheet |
| `↑` `↓` | Navigate suggestions |
| `Tab` | Accept suggestion |

## Discoverability

New users don't need to read this README — the app teaches itself:

- **Rotating placeholders** cycle through example commands in the input field
- **Autocomplete suggestions** appear as you type, showing matching commands
- **Cheat sheet** (`?` button or `⌘/`) lists every command with examples
- **Clickable examples** in the cheat sheet fill the input so you can learn by doing

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Vite** — dev server & build
- **mathjs** — expression evaluation engine
- **Zustand** — state management
- **Framer Motion** — animations
- **CoinGecko API** — live prices (free, no key required, 30s cache)

## Build for Production

```bash
npm run build
npm run preview
```

Output goes to `dist/`.

## License

MIT
