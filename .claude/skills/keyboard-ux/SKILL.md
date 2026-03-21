# Skill: Keyboard UX

Padrões para produtividade por teclado, command palette, navegação e focus management no painel de atendimentos.

---

## 1. Hook de Atalhos Globais

```typescript
// frontend/src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react'

type Handler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  meta?: boolean   // Cmd (Mac) / Ctrl (Win)
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: Handler
  when?: () => boolean  // condição para ativar
}

export function useKeyboardShortcut(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Não ativar quando foco está em inputs
    const target = e.target as HTMLElement
    const isEditing = target.matches('input, textarea, select, [contenteditable]')

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const metaMatch = shortcut.meta
        ? (e.metaKey || e.ctrlKey)  // Cmd no Mac, Ctrl no Win
        : !shortcut.meta || (!e.metaKey && !e.ctrlKey)
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !shortcut.ctrl || !e.ctrlKey
      const shiftMatch = shortcut.shift ? e.shiftKey : !shortcut.shift
      const conditionMet = !shortcut.when || shortcut.when()

      // Atalhos com modificador funcionam em inputs; simples (j/k) não
      const shouldBlock = isEditing && !shortcut.meta && !shortcut.ctrl && !shortcut.alt

      if (keyMatch && metaMatch && ctrlMatch && shiftMatch && conditionMet && !shouldBlock) {
        e.preventDefault()
        shortcut.handler(e)
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Atalhos que NÃO devem ser usados (conflitos com browser):
// Ctrl+R (reload), Ctrl+T (new tab), Ctrl+W (close tab)
// Ctrl+N (new window), Ctrl+L (address bar), F5, F11, F12
```

---

## 2. Navegação j/k em Listas

```typescript
// frontend/src/hooks/useListNavigation.ts
export function useListNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  selectedIndex: number,
  setSelectedIndex: (i: number) => void
) {
  useKeyboardShortcut([
    {
      key: 'j',
      handler: () => {
        const next = Math.min(selectedIndex + 1, items.length - 1)
        setSelectedIndex(next)
        scrollItemIntoView(next)
      }
    },
    {
      key: 'k',
      handler: () => {
        const prev = Math.max(selectedIndex - 1, 0)
        setSelectedIndex(prev)
        scrollItemIntoView(prev)
      }
    },
    {
      key: 'Enter',
      handler: () => {
        if (selectedIndex >= 0 && items[selectedIndex]) {
          onSelect(items[selectedIndex], selectedIndex)
        }
      }
    },
    {
      key: 'Escape',
      handler: () => setSelectedIndex(-1)
    }
  ])
}

function scrollItemIntoView(index: number) {
  const el = document.querySelector(`[data-list-index="${index}"]`)
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

// Uso no componente de lista:
// <div data-list-index={index} className={selectedIndex === index ? 'ring-2 ring-brand' : ''}>
```

---

## 3. Command Palette (Cmd+K)

```tsx
// frontend/src/components/CommandPalette.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string[]
  action: () => void
  group?: string
}

export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Abrir com Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus no input ao abrir
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(query.toLowerCase())
  )

  // Navegar com setas no palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      filtered[activeIndex].action()
      setOpen(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50
                       bg-[var(--bg-elevated)] border border-[var(--border-default)]
                       rounded-xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]">
              <SearchIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
                onKeyDown={handleKeyDown}
                placeholder="O que você quer fazer?"
                className="flex-1 bg-transparent text-[var(--text-primary)] text-sm
                           placeholder:text-[var(--text-tertiary)] outline-none"
              />
              <kbd className="text-[10px] text-[var(--text-tertiary)] border border-[var(--border-default)]
                              rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Resultados */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-tertiary)] py-8">
                  Nenhum resultado para "{query}"
                </p>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    data-list-index={i}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                                transition-colors duration-75
                                ${i === activeIndex
                                  ? 'bg-[var(--brand-100)] text-[var(--brand-600)]'
                                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                                }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => { cmd.action(); setOpen(false) }}
                  >
                    {cmd.icon && (
                      <span className="w-4 h-4 flex-shrink-0">{cmd.icon}</span>
                    )}
                    <span className="flex-1">
                      <span className="text-sm font-medium">{cmd.label}</span>
                      {cmd.description && (
                        <span className="block text-xs text-[var(--text-secondary)]">
                          {cmd.description}
                        </span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <span className="flex gap-1">
                        {cmd.shortcut.map(k => (
                          <kbd key={k} className="text-[10px] border border-[var(--border-default)]
                                                  rounded px-1.5 py-0.5 text-[var(--text-tertiary)]">
                            {k}
                          </kbd>
                        ))}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

---

## 4. Focus Management e Focus Trap

```typescript
// Para modais e overlays — impede Tab de sair do modal
export function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Focus no primeiro elemento
    first?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [active, ref])
}
```

---

## 5. Visual de Teclas `<kbd>`

```tsx
// Componente reutilizável
function KbdShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Atalho: ${keys.join('+')}`}>
      {keys.map((key, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <kbd className="
            inline-flex items-center justify-center
            min-w-[1.25rem] h-5 px-1.5
            text-[10px] font-mono font-medium
            text-[var(--text-secondary)]
            bg-[var(--bg-subtle)]
            border border-[var(--border-strong)]
            rounded
            shadow-[0_1px_0_var(--border-strong)]
          ">
            {key}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-[10px] text-[var(--text-tertiary)]">+</span>
          )}
        </span>
      ))}
    </span>
  )
}

// Uso:
// <KbdShortcut keys={['⌘', 'K']} />
// <KbdShortcut keys={['J']} />
// Em tooltips: <Tooltip content={<>Próximo <KbdShortcut keys={['J']} /></>}>
```

---

## 6. Preview no Hover

```tsx
// Tooltip com preview de conversa
function ConversationPreview({ conversation }: { conversation: Conversation }) {
  return (
    <div className="w-72 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{conversation.name}</span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {formatRelativeTime(conversation.lastMessageAt)}
        </span>
      </div>
      <div className="space-y-1">
        {conversation.messages.slice(-3).map(msg => (
          <div key={msg.id} className="text-xs text-[var(--text-secondary)] truncate">
            <span className="font-medium">
              {msg.role === 'agent' ? '🤖' : '👤'}
            </span>{' '}
            {msg.content}
          </div>
        ))}
      </div>
      {conversation.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {conversation.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full
                                       bg-[var(--brand-100)] text-[var(--brand-600)]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Atalhos do Painel (referência)

| Atalho | Ação |
|--------|------|
| `⌘K` / `Ctrl+K` | Abrir command palette |
| `J` | Próxima conversa |
| `K` | Conversa anterior |
| `Enter` | Abrir conversa selecionada |
| `Escape` | Voltar / fechar modal |
| `⌘/` | Mostrar atalhos disponíveis |

---

## Checklist antes de entregar

- [ ] Atalhos não conflitam com browser (Ctrl+R, Ctrl+T, Ctrl+W, etc.)
- [ ] j/k não ativam dentro de inputs/textareas
- [ ] Command palette tem busca funcional e navegação por setas
- [ ] Modais têm focus trap (Tab não sai do modal)
- [ ] Todos os elementos interativos têm `tabindex` e focus ring visível
- [ ] Atalhos documentados com `<kbd>` na UI
- [ ] ARIA labels nos elementos de navegação
