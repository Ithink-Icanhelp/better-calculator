/**
 * Input parser and normalizer.
 * 
 * Transforms raw user input into a form the engine can evaluate.
 * Handles human-friendly shortcuts and normalizations.
 * 
 * Future: This is where NLP parsing, unit detection, and
 * currency symbol recognition would be added.
 */

export interface ParsedInput {
  raw: string;
  normalized: string;
  type: 'expression' | 'assignment' | 'command' | 'empty';
}

/**
 * Normalize user input for the math engine.
 * Converts human-friendly shortcuts to valid math expressions.
 */
export function parseInput(raw: string): ParsedInput {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { raw, normalized: '', type: 'empty' };
  }

  let normalized = trimmed;

  // Replace common Unicode math symbols with ASCII equivalents
  normalized = normalized.replace(/×/g, '*');
  normalized = normalized.replace(/÷/g, '/');
  normalized = normalized.replace(/−/g, '-');
  normalized = normalized.replace(/π/g, 'pi');

  // Replace `^` with `^` (mathjs supports this natively)
  // Replace `**` with `^` for Python-style exponentiation
  normalized = normalized.replace(/\*\*/g, '^');

  // Allow implicit multiplication: `2(3+4)` → `2*(3+4)`
  normalized = normalized.replace(/(\d)\s*\(/g, '$1*(');

  // Allow `2pi` → `2*pi`, `3e` → `3*e`
  normalized = normalized.replace(/(\d)(pi|e|sqrt|log|sin|cos|tan|abs)\b/gi, '$1*$2');

  // Detect type
  const isAssignment = /^[a-zA-Z_]\w*\s*=\s*.+$/.test(normalized);

  return {
    raw,
    normalized,
    type: isAssignment ? 'assignment' : 'expression',
  };
}

/**
 * Format a numeric result for display.
 * Adds thousands separators and limits decimal places.
 */
export function formatResult(value: number | string | null): string {
  if (value === null) return '';

  if (typeof value === 'string') return value;

  if (!isFinite(value)) {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '-∞';
    return 'NaN';
  }

  // If it's a clean integer or has few decimals, show as-is
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return value.toLocaleString('en-US');
  }

  // For decimals, limit to 10 significant digits
  const formatted = parseFloat(value.toPrecision(10));
  const parts = formatted.toString().split('.');
  parts[0] = parseInt(parts[0]).toLocaleString('en-US');
  return parts.join('.');
}
