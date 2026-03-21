import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onEscape?: () => void;
  onAnalytics?: () => void;
  onCommandPalette?: () => void;
  onFocusMode?: () => void;
}

export function useKeyboardShortcuts({
  onNext,
  onPrevious,
  onEscape,
  onAnalytics,
  onCommandPalette,
  onFocusMode,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K — command palette (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      // Skip simple shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || (e.target as HTMLElement).isContentEditable;
      if (isEditing) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          onNext?.();
          break;
        case 'j':
          e.preventDefault();
          onPrevious?.();
          break;
        case 'escape':
          onEscape?.();
          break;
        case 'a':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onAnalytics?.();
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onFocusMode?.();
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onEscape, onAnalytics, onCommandPalette, onFocusMode]);
}
