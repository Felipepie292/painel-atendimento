import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onEscape?: () => void;
  onAnalytics?: () => void;
}

export function useKeyboardShortcuts({ onNext, onPrevious, onEscape, onAnalytics }: KeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onEscape, onAnalytics]);
}
