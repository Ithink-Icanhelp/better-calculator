/**
 * Primary input component.
 * 
 * Auto-focused on mount, handles keyboard navigation.
 * Shows live result inline as user types.
 * Features:
 * - Rotating placeholder hints to teach new users
 * - Autocomplete suggestions dropdown (arrow keys to navigate, Tab to accept)
 * - Rich display for crypto results (multi-line preview)
 * - Loading indicator for async price lookups
 */

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../store';
import { PLACEHOLDER_HINTS } from '../core';

export function InputField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    currentInput, liveResult, liveError, liveRichDisplay, liveResultLabel,
    isLoading, suggestions, selectedSuggestionIndex,
    setInput, submitEntry, applySuggestion, moveSuggestion,
  } = useCalcStore();

  // ── Rotating placeholder hints ──
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % PLACEHOLDER_HINTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus when clicking anywhere (keyboard-first UX)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't steal focus from suggestion clicks
      if ((e.target as HTMLElement).closest('.suggestions-list')) return;
      inputRef.current?.focus();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Suggestion navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSuggestion('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSuggestion('up');
        return;
      }
      if (e.key === 'Tab' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex]);
        inputRef.current?.focus();
        return;
      }
    }

    if (e.key === 'Enter' && currentInput.trim()) {
      e.preventDefault();
      // If a suggestion is selected, apply it instead of submitting
      if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
        applySuggestion(suggestions[selectedSuggestionIndex]);
        inputRef.current?.focus();
        return;
      }
      submitEntry();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (e.key === 'Escape') {
      setInput('');
    }
  };

  return (
    <div className="input-container">
      <div className="input-row">
        <span className="input-prompt">
          {isLoading ? (
            <span className="loading-spinner" />
          ) : (
            '>'
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          className="calc-input"
          value={currentInput}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_HINTS[hintIndex]}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        {liveResult && !liveError && !liveRichDisplay && (
          <motion.span
            className="live-result"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            key={liveResult}
          >
            = {liveResult}
          </motion.span>
        )}
        {liveResultLabel && !liveRichDisplay && (
          <span className="live-label">{liveResultLabel}</span>
        )}
      </div>

      {/* Rich display for crypto results (multi-line preview) */}
      <AnimatePresence>
        {liveRichDisplay && (
          <motion.pre
            className="live-rich-display"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {liveResultLabel && <span className="rich-label">{liveResultLabel}</span>}
            {'\n'}{liveRichDisplay}
          </motion.pre>
        )}
      </AnimatePresence>

      {liveError && (
        <motion.div
          className="live-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {liveError}
        </motion.div>
      )}

      {/* Autocomplete suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && !liveRichDisplay && (
          <motion.div
            className="suggestions-list"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {suggestions.map((s, i) => (
              <div
                key={s.text}
                className={`suggestion-item ${i === selectedSuggestionIndex ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s);
                  inputRef.current?.focus();
                }}
              >
                <span className="suggestion-text">{s.text}</span>
                <span className="suggestion-desc">{s.description}</span>
              </div>
            ))}
            <div className="suggestion-hint">
              <kbd>↑↓</kbd> navigate &middot; <kbd>Tab</kbd> or <kbd>Enter</kbd> accept
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
