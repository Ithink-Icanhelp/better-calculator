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

import { useEffect } from 'react';
import { InputField, HistoryList, VariablesPanel } from './ui';
import { useCalcStore } from './store';
import './App.css';

function App() {
  const { clearAll, clearHistory } = useCalcStore();

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAll, clearHistory]);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Better Calculator</span>
        <span className="app-shortcuts">
          <kbd>Enter</kbd> submit &middot; <kbd>Esc</kbd> clear &middot; <kbd>⌘K</kbd> reset
        </span>
      </header>
      <main className="app-main">
        <InputField />
        <VariablesPanel />
        <HistoryList />
      </main>
    </div>
  );
}

export default App;
