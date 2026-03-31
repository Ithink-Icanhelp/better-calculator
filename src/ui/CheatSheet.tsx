/**
 * Expandable cheat sheet panel.
 * 
 * Shows all available commands organized by category.
 * Toggled via ? button or ⌘/ shortcut.
 * Each example is clickable — fills the input field so users
 * can learn by doing, not by reading.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CHEAT_SHEET } from '../core';
import { useCalcStore } from '../store';

interface CheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheatSheet({ isOpen, onClose }: CheatSheetProps) {
  const { setInput } = useCalcStore();

  const handleExampleClick = (input: string) => {
    setInput(input);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cheatsheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="cheatsheet-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cheatsheet-header">
              <span className="cheatsheet-title">What can I type?</span>
              <button className="cheatsheet-close" onClick={onClose}>
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className="cheatsheet-body">
              {CHEAT_SHEET.map((cat) => (
                <div key={cat.title} className="cheatsheet-category">
                  <div className="cheatsheet-cat-title">
                    <span className="cheatsheet-icon">{cat.icon}</span>
                    {cat.title}
                  </div>
                  <div className="cheatsheet-examples">
                    {cat.examples.map((ex) => (
                      <div
                        key={ex.input}
                        className="cheatsheet-example"
                        onClick={() => handleExampleClick(ex.input)}
                      >
                        <span className="cheatsheet-input">{ex.input}</span>
                        <span className="cheatsheet-output">{ex.output}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="cheatsheet-footer">
              Click any example to try it
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
