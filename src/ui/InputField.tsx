/**
 * Primary input component.
 * 
 * Auto-focused on mount, handles keyboard navigation.
 * Shows live result inline as user types.
 * Enter commits to history, Escape clears.
 */

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCalcStore } from '../store';

export function InputField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentInput, liveResult, liveError, setInput, submitEntry } = useCalcStore();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus when clicking anywhere (keyboard-first UX)
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      e.preventDefault();
      submitEntry();
      // Re-focus after submit
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (e.key === 'Escape') {
      setInput('');
    }
  };

  return (
    <div className="input-container">
      <div className="input-row">
        <span className="input-prompt">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="calc-input"
          value={currentInput}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an expression..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        {liveResult && !liveError && (
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
      </div>
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
    </div>
  );
}
