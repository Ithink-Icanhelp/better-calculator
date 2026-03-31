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
import { createEngine } from '../core';
import type { CalcEngine, EvalResult } from '../core';
import { parseInput, formatResult } from '../parser';

export interface HistoryEntry {
  id: string;
  input: string;
  result: string;
  rawValue: number | string | null;
  error: string | null;
  isAssignment: boolean;
  variableName?: string;
  timestamp: number;
}

interface CalcState {
  // Current input
  currentInput: string;
  liveResult: string;
  liveError: string | null;

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
    history: [],
    variables: {},
    engine,

    /**
     * Update input and compute live result.
     * Called on every keystroke for instant feedback.
     */
    setInput: (input: string) => {
      const parsed = parseInput(input);

      if (parsed.type === 'empty') {
        set({ currentInput: input, liveResult: '', liveError: null });
        return;
      }

      const result: EvalResult = engine.evaluate(parsed.normalized);

      set({
        currentInput: input,
        liveResult: result.error ? '' : formatResult(result.value),
        liveError: result.error,
        variables: engine.getVariables(),
      });
    },

    /**
     * Commit current input to history (on Enter).
     */
    submitEntry: () => {
      const { currentInput, engine } = get();
      const parsed = parseInput(currentInput);

      if (parsed.type === 'empty') return;

      const result = engine.evaluate(parsed.normalized);

      const entry: HistoryEntry = {
        id: generateId(),
        input: currentInput,
        result: result.error ? '' : formatResult(result.value),
        rawValue: result.value,
        error: result.error,
        isAssignment: result.isAssignment,
        variableName: result.variableName,
        timestamp: Date.now(),
      };

      set((state) => ({
        history: [entry, ...state.history],
        currentInput: '',
        liveResult: '',
        liveError: null,
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
        variables: {},
      });
    },
  };
});
