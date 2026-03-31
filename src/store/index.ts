/**
 * State management using Zustand.
 * 
 * Manages:
 * - Calculation history (ordered list of entries)
 * - User-defined variables
 * - Current input state
 * 
 * The store is the single source of truth for the app.
 * The math engine instance lives here to ensure variable
 * state stays synchronized between evaluations.
 */

import { create } from 'zustand';
import { createEngine, tryCryptoCommand, tryPriceCommand, getSuggestions } from '../core';
import type { CalcEngine, EvalResult, Suggestion } from '../core';
import { parseInput, formatResult } from '../parser';

export interface HistoryEntry {
  id: string;
  input: string;
  result: string;
  rawValue: number | string | null;
  error: string | null;
  isAssignment: boolean;
  variableName?: string;
  /** Multi-line display for crypto results (shown instead of single-line result) */
  richDisplay?: string;
  /** Label for crypto results (e.g., 'Profit', 'Gas Fee') */
  resultLabel?: string;
  timestamp: number;
}

interface CalcState {
  // Current input
  currentInput: string;
  liveResult: string;
  liveError: string | null;
  /** Multi-line live display for crypto results */
  liveRichDisplay: string | null;
  /** Label for current crypto result */
  liveResultLabel: string | null;
  /** Whether an async price lookup is in progress */
  isLoading: boolean;

  // Suggestions
  suggestions: Suggestion[];
  selectedSuggestionIndex: number;

  // History
  history: HistoryEntry[];

  // Variables
  variables: Record<string, number>;

  // Engine reference (not serialized)
  engine: CalcEngine;

  // Actions
  setInput: (input: string) => void;
  submitEntry: () => void;
  editHistoryEntry: (id: string, newInput: string) => void;
  deleteHistoryEntry: (id: string) => void;
  reuseResult: (id: string) => void;
  applySuggestion: (suggestion: Suggestion) => void;
  moveSuggestion: (direction: 'up' | 'down') => void;
  clearHistory: () => void;
  clearAll: () => void;
}

let idCounter = 0;
function generateId(): string {
  return `entry-${Date.now()}-${++idCounter}`;
}

export const useCalcStore = create<CalcState>((set, get) => {
  const engine = createEngine();

  return {
    currentInput: '',
    liveResult: '',
    liveError: null,
    liveRichDisplay: null,
    liveResultLabel: null,
    isLoading: false,
    suggestions: [],
    selectedSuggestionIndex: -1,
    history: [],
    variables: {},
    engine,

    /**
     * Update input and compute live result.
     * Called on every keystroke for instant feedback.
     * 
     * Evaluation priority:
     * 1. Crypto commands (sync — sats, profit, gas, etc.)
     * 2. Standard math expressions
     * 3. Suggestions update in parallel
     * 
     * Price lookups are async and only triggered on Enter.
     */
    setInput: (input: string) => {
      const parsed = parseInput(input);

      if (parsed.type === 'empty') {
        set({ currentInput: input, liveResult: '', liveError: null, liveRichDisplay: null, liveResultLabel: null, suggestions: [], selectedSuggestionIndex: -1 });
        return;
      }

      // Compute suggestions
      const suggestions = getSuggestions(input, 5);

      // Try crypto command first (synchronous)
      const cryptoResult = tryCryptoCommand(parsed.normalized);
      if (cryptoResult) {
        set({
          currentInput: input,
          liveResult: formatResult(cryptoResult.value),
          liveRichDisplay: cryptoResult.display,
          liveResultLabel: cryptoResult.label,
          liveError: null,
          suggestions,
          selectedSuggestionIndex: -1,
          variables: engine.getVariables(),
        });
        return;
      }

      // Standard math evaluation
      const result: EvalResult = engine.evaluate(parsed.normalized);

      set({
        currentInput: input,
        liveResult: result.error ? '' : formatResult(result.value),
        liveRichDisplay: null,
        liveResultLabel: null,
        liveError: result.error,
        suggestions,
        selectedSuggestionIndex: -1,
        variables: engine.getVariables(),
      });
    },

    /**
     * Commit current input to history (on Enter).
     * 
     * If the input matches a price command (async), we show a loading
     * state and resolve the price before adding to history.
     * Crypto commands and math are committed synchronously.
     */
    submitEntry: () => {
      const { currentInput, engine, liveRichDisplay, liveResultLabel } = get();
      const parsed = parseInput(currentInput);

      if (parsed.type === 'empty') return;

      // Check if this is a crypto command that was already evaluated live
      const cryptoResult = tryCryptoCommand(parsed.normalized);
      if (cryptoResult) {
        const entry: HistoryEntry = {
          id: generateId(),
          input: currentInput,
          result: formatResult(cryptoResult.value),
          rawValue: cryptoResult.value,
          error: null,
          isAssignment: false,
          richDisplay: cryptoResult.display,
          resultLabel: cryptoResult.label,
          timestamp: Date.now(),
        };
        set((state) => ({
          history: [entry, ...state.history],
          currentInput: '',
          liveResult: '',
          liveError: null,
          liveRichDisplay: null,
          liveResultLabel: null,
          suggestions: [],
        }));
        return;
      }

      // Check if this is an async price lookup
      const pricePromise = tryPriceCommand(parsed.normalized);
      if (pricePromise) {
        const inputSnapshot = currentInput;
        set({ isLoading: true, currentInput: '', liveResult: '', liveError: null, liveRichDisplay: null, liveResultLabel: null, suggestions: [] });

        pricePromise
          .then((priceResult) => {
            const entry: HistoryEntry = {
              id: generateId(),
              input: inputSnapshot,
              result: formatResult(priceResult.value),
              rawValue: priceResult.value,
              error: null,
              isAssignment: false,
              richDisplay: priceResult.display,
              resultLabel: priceResult.label,
              timestamp: Date.now(),
            };
            set((state) => ({
              history: [entry, ...state.history],
              isLoading: false,
            }));
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Price lookup failed';
            const entry: HistoryEntry = {
              id: generateId(),
              input: inputSnapshot,
              result: '',
              rawValue: null,
              error: msg,
              isAssignment: false,
              timestamp: Date.now(),
            };
            set((state) => ({
              history: [entry, ...state.history],
              isLoading: false,
            }));
          });
        return;
      }

      // Standard math evaluation
      const result = engine.evaluate(parsed.normalized);

      const entry: HistoryEntry = {
        id: generateId(),
        input: currentInput,
        result: result.error ? '' : formatResult(result.value),
        rawValue: result.value,
        error: result.error,
        isAssignment: result.isAssignment,
        variableName: result.variableName,
        richDisplay: liveRichDisplay ?? undefined,
        resultLabel: liveResultLabel ?? undefined,
        timestamp: Date.now(),
      };

      set((state) => ({
        history: [entry, ...state.history],
        currentInput: '',
        liveResult: '',
        liveError: null,
        liveRichDisplay: null,
        liveResultLabel: null,
        suggestions: [],
        variables: engine.getVariables(),
      }));
    },

    /**
     * Edit a previous history entry and re-evaluate.
     */
    editHistoryEntry: (id: string, newInput: string) => {
      const { engine } = get();
      const parsed = parseInput(newInput);
      const result = engine.evaluate(parsed.normalized);

      set((state) => ({
        history: state.history.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                input: newInput,
                result: result.error ? '' : formatResult(result.value),
                rawValue: result.value,
                error: result.error,
                isAssignment: result.isAssignment,
                variableName: result.variableName,
              }
            : entry
        ),
        variables: engine.getVariables(),
      }));
    },

    /**
     * Remove a history entry.
     */
    deleteHistoryEntry: (id: string) => {
      set((state) => ({
        history: state.history.filter((entry) => entry.id !== id),
      }));
    },

    /**
     * Insert a previous result into the current input.
     */
    reuseResult: (id: string) => {
      const { history } = get();
      const entry = history.find((e) => e.id === id);
      if (entry && entry.rawValue !== null) {
        const value = String(entry.rawValue);
        set((state) => ({
          currentInput: state.currentInput + value,
        }));
        // Re-evaluate with the new input
        get().setInput(get().currentInput);
      }
    },

    /**
     * Fill the input with a suggestion.
     */
    applySuggestion: (suggestion: Suggestion) => {
      get().setInput(suggestion.text);
    },

    /**
     * Navigate suggestions with arrow keys.
     */
    moveSuggestion: (direction: 'up' | 'down') => {
      set((state) => {
        const len = state.suggestions.length;
        if (len === 0) return state;
        let idx = state.selectedSuggestionIndex;
        if (direction === 'down') {
          idx = idx < len - 1 ? idx + 1 : 0;
        } else {
          idx = idx > 0 ? idx - 1 : len - 1;
        }
        return { selectedSuggestionIndex: idx };
      });
    },

    clearHistory: () => {
      set({ history: [] });
    },

    clearAll: () => {
      engine.clearVariables();
      set({
        history: [],
        currentInput: '',
        liveResult: '',
        liveError: null,
        liveRichDisplay: null,
        liveResultLabel: null,
        isLoading: false,
        suggestions: [],
        selectedSuggestionIndex: -1,
        variables: {},
      });
    },
  };
});
