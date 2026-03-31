/**
 * History display component.
 * 
 * Shows past calculations as a vertical stack.
 * Supports two display modes:
 * - Simple: expression → result (for math)
 * - Rich: expression → multi-line formatted output (for crypto commands)
 * 
 * Each entry can be clicked to reuse its result.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../store';
import type { HistoryEntry } from '../store';

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const { reuseResult } = useCalcStore();

  // Rich display mode for crypto results
  if (entry.richDisplay) {
    return (
      <motion.div
        className="history-entry history-entry--rich"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        layout
      >
        <div className="history-input">
          {entry.resultLabel && (
            <span className="crypto-badge">{entry.resultLabel}</span>
          )}
          <span className="history-expression">{entry.input}</span>
        </div>
        <pre
          className="history-rich-result"
          onClick={() => reuseResult(entry.id)}
          title="Click to reuse primary value"
        >
          {entry.richDisplay}
        </pre>
      </motion.div>
    );
  }

  // Standard display mode
  return (
    <motion.div
      className="history-entry"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      layout
    >
      <div className="history-input" title="Click result to reuse">
        {entry.isAssignment && entry.variableName && (
          <span className="variable-badge">{entry.variableName}</span>
        )}
        <span className="history-expression">{entry.input}</span>
      </div>
      {entry.error ? (
        <div className="history-error">{entry.error}</div>
      ) : (
        <div
          className="history-result"
          onClick={() => reuseResult(entry.id)}
          title="Click to reuse this result"
        >
          = {entry.result}
        </div>
      )}
    </motion.div>
  );
}

export function HistoryList() {
  const { history, isLoading } = useCalcStore();

  if (history.length === 0 && !isLoading) {
    return (
      <div className="history-empty">
        <div className="history-empty-text">
          Type an expression and press Enter
        </div>
        <div className="history-hints">
          <span>100 + 20%</span>
          <span>btc price</span>
          <span>1 btc in sats</span>
          <span>profit 1 btc 28000 67000</span>
          <span>stake 10 eth 4.5 365</span>
          <span>gas 21000 30</span>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      {isLoading && (
        <motion.div
          className="history-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <span className="loading-spinner" /> Fetching live price...
        </motion.div>
      )}
      <AnimatePresence mode="popLayout">
        {history.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </AnimatePresence>
    </div>
  );
}
