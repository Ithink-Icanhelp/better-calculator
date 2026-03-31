/**
 * History display component.
 * 
 * Shows past calculations as a vertical stack.
 * Each entry can be:
 * - Clicked to reuse its result
 * - Edited inline (future enhancement)
 * 
 * Newest entries appear at the top with a subtle entrance animation.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../store';
import type { HistoryEntry } from '../store';

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const { reuseResult } = useCalcStore();

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
  const { history } = useCalcStore();

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <div className="history-empty-text">
          Type an expression and press Enter
        </div>
        <div className="history-hints">
          <span>100 + 20%</span>
          <span>sqrt(144)</span>
          <span>salary = 3000</span>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      <AnimatePresence mode="popLayout">
        {history.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </AnimatePresence>
    </div>
  );
}
