/**
 * Better Calculator — main application shell.
 * 
 * Layout:
 * - Input field pinned to top
 * - Variables panel (visible when variables exist)
 * - History stack below
 * 
 * Keyboard shortcuts:
 * - Cmd/Ctrl+K: Clear all
 * - Cmd/Ctrl+L: Clear history only
 */

import { useEffect, useState } from 'react';
import { InputField, HistoryList, VariablesPanel, CheatSheet } from './ui';
import { useCalcStore } from './store';
import './App.css';

function App() {
  const { clearAll, clearHistory } = useCalcStore();
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        clearAll();
      }
      if (mod && e.key === 'l') {
        e.preventDefault();
        clearHistory();
      }
      // ⌘/ or Ctrl+/ to toggle cheat sheet
      if (mod && e.key === '/') {
        e.preventDefault();
        setShowCheatSheet((v) => !v);
      }
      // Escape closes cheat sheet
      if (e.key === 'Escape' && showCheatSheet) {
        setShowCheatSheet(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAll, clearHistory, showCheatSheet]);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Better Calculator</span>
        <div className="app-header-right">
          <button
            className="help-button"
            onClick={() => setShowCheatSheet((v) => !v)}
            title="What can I type? (⌘/)"
          >
            ?
          </button>
          <span className="app-shortcuts">
            <kbd>⌘/</kbd> help
          </span>
        </div>
      </header>
      <main className="app-main">
        <InputField />
        <VariablesPanel />
        <HistoryList />
      </main>
      <CheatSheet isOpen={showCheatSheet} onClose={() => setShowCheatSheet(false)} />
    </div>
  );
}

export default App;
