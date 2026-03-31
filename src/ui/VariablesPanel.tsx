/**
 * Variables panel.
 * 
 * Shows currently defined user variables as small badges.
 * Provides quick visibility into the calculation context.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../store';

export function VariablesPanel() {
  const { variables } = useCalcStore();
  const entries = Object.entries(variables);

  if (entries.length === 0) return null;

  return (
    <motion.div
      className="variables-panel"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.2 }}
    >
      <div className="variables-label">Variables</div>
      <div className="variables-list">
        <AnimatePresence>
          {entries.map(([name, value]) => (
            <motion.span
              key={name}
              className="variable-chip"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {name} = {value.toLocaleString('en-US')}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
