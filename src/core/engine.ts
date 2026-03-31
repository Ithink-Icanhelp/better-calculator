/**
 * Core math evaluation engine.
 * 
 * Uses mathjs under the hood but extends it with:
 * - Smart percent handling (100 + 20% = 120)
 * - Variable assignment and lookup
 * - Human-friendly input normalization
 * 
 * Designed to be modular — future extensions (units, currency, NLP)
 * can be added by registering new preprocessors or evaluation strategies.
 */

import { create, all, type MathJsInstance } from 'mathjs';

export interface EvalResult {
  value: number | string | null;
  error: string | null;
  isAssignment: boolean;
  variableName?: string;
}

export interface CalcEngine {
  evaluate: (input: string) => EvalResult;
  getVariables: () => Record<string, number>;
  setVariable: (name: string, value: number) => void;
  clearVariables: () => void;
}

export function createEngine(): CalcEngine {
  const math: MathJsInstance = create(all, {
    number: 'number',
    precision: 14,
  });

  // User-defined variables stored separately for clean access
  const userVariables: Record<string, number> = {};

  // Create a persistent scope so variables persist across evaluations
  const scope: Record<string, number> = {};

  function evaluate(input: string): EvalResult {
    const trimmed = input.trim();
    if (!trimmed) {
      return { value: null, error: null, isAssignment: false };
    }

    try {
      // Check for variable assignment: `salary = 3000`
      const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const exprPart = assignMatch[2];

        // Prevent overriding built-in math functions
        const reserved = ['sin', 'cos', 'tan', 'sqrt', 'log', 'abs', 'ceil', 'floor', 'round', 'pi', 'e'];
        if (reserved.includes(varName.toLowerCase())) {
          return { value: null, error: `"${varName}" is a reserved name`, isAssignment: false };
        }

        const result = evaluateExpression(exprPart);
        if (result.error) return result;

        const numValue = Number(result.value);
        userVariables[varName] = numValue;
        scope[varName] = numValue;

        return {
          value: numValue,
          error: null,
          isAssignment: true,
          variableName: varName,
        };
      }

      return evaluateExpression(trimmed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { value: null, error: message, isAssignment: false };
    }
  }

  /**
   * Evaluate a mathematical expression with smart percent handling.
   */
  function evaluateExpression(expr: string): EvalResult {
    try {
      // Apply smart percent preprocessing
      const processed = preprocessPercent(expr);

      const result = math.evaluate(processed, scope);

      // mathjs can return various types; normalize to number or string
      if (typeof result === 'number') {
        return { value: cleanNumber(result), error: null, isAssignment: false };
      }
      if (typeof result === 'object' && result !== null && 'entries' in result) {
        // Matrix or other complex type — convert to string
        return { value: String(result), error: null, isAssignment: false };
      }
      return { value: Number(result), error: null, isAssignment: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Evaluation error';
      return { value: null, error: message, isAssignment: false };
    }
  }

  /**
   * Smart percent handling.
   * 
   * Transforms human-intuitive percent expressions:
   *   `100 + 20%`  → `100 + 100 * 0.20`  = 120
   *   `100 - 20%`  → `100 - 100 * 0.20`  = 80
   *   `200 * 10%`  → `200 * 0.10`         = 20
   *   `200 / 10%`  → `200 / 0.10`         = 2000
   *   `20%`        → `0.20`               (standalone)
   * 
   * This is the key differentiator from standard math libraries.
   */
  function preprocessPercent(expr: string): string {
    // Handle: <expr> +/- <number>%
    // We need to find patterns like `X + Y%` and transform them to `X + X * (Y/100)`
    // Use a multi-pass approach for nested expressions
    let result = expr;

    // Pattern: (something) [+-] number%
    // We wrap the left-hand side and compute percent relative to it
    result = result.replace(
      /(.+?)\s*(\+|-)\s*([\d.]+)\s*%/g,
      (_, lhs, op, pct) => {
        const factor = `(${pct}/100)`;
        return `(${lhs.trim()}) ${op} (${lhs.trim()}) * ${factor}`;
      }
    );

    // If there's still a standalone `number%` (e.g., in `200 * 10%`), convert to decimal
    result = result.replace(/([\d.]+)\s*%/g, '($1/100)');

    return result;
  }

  /**
   * Clean floating point artifacts: 0.30000000000000004 → 0.3
   */
  function cleanNumber(n: number): number {
    if (!isFinite(n)) return n;
    // Round to 10 decimal places to eliminate floating-point noise
    return parseFloat(n.toPrecision(12));
  }

  function getVariables(): Record<string, number> {
    return { ...userVariables };
  }

  function setVariable(name: string, value: number): void {
    userVariables[name] = value;
    scope[name] = value;
  }

  function clearVariables(): void {
    for (const key of Object.keys(userVariables)) {
      delete userVariables[key];
      delete scope[key];
    }
  }

  return { evaluate, getVariables, setVariable, clearVariables };
}
