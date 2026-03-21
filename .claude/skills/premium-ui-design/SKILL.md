# Skill: Premium UI Design

Padrões de design de alta qualidade para o painel de atendimentos. Referências: Linear, Vercel, Raycast, Intercom.

---

## 1. Sistema de tokens CSS

Defina todas as variáveis no `:root` e no seletor `.dark`. Nunca use cores hard-coded.

```css
:root {
  /* Superfícies */
  --bg-base: #ffffff;
  --bg-subtle: #f9fafb;
  --bg-elevated: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Bordas */
  --border-default: #e5e7eb;
  --border-strong: #d1d5db;

  /* Texto */
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-disabled: #d1d5db;

  /* Brand */
  --brand-500: #6366f1;
  --brand-600: #4f46e5;
  --brand-100: #e0e7ff;

  /* Status */
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;

  /* Espaçamento (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Raios */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.10);
}

.dark {
  --bg-base: #0f1117;
  --bg-subtle: #161b22;
  --bg-elevated: #1c2128;
  --bg-overlay: rgba(0, 0, 0, 0.7);
  --border-default: #30363d;
  --border-strong: #484f58;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-tertiary: #6e7681;
  --text-disabled: #484f58;
  --brand-500: #818cf8;
  --brand-600: #6366f1;
  --brand-100: #1e1b4b;
}
```

---

## 2. Micro-animações com Framer Motion

### Princípios
- Duração máxima: 300ms para interações, 500ms para transições de página
- Easing padrão: `[0.16, 1, 0.3, 1]` (spring-like ease-out)
- Sempre definir `initial`, `animate`, `exit` para elementos que entram/saem do DOM
- Respeitar `prefers-reduced-motion`:

```tsx
import { useReducedMotion } from 'framer-motion'

const shouldReduce = useReducedMotion()
const spring = shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }
```

### Padrões reutilizáveis

```tsx
// Fade + slide up (entrada de cards, listas)
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
}

// Escala sutil (botões, badges)
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.15 }
}

// Stagger para listas
const listContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
}

// Hover state de card
const cardHover = {
  whileHover: { y: -2, boxShadow: 'var(--shadow-lg)' },
  whileTap: { scale: 0.99 },
  transition: { duration: 0.15 }
}
```

### AnimatePresence para listas dinâmicas

```tsx
import { AnimatePresence, motion } from 'framer-motion'

<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      {...fadeUp}
    >
      {/* conteúdo */}
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 3. Skeleton Loading

Use skeletons ao invés de spinners para conteúdo estruturado.

```tsx
// Componente base
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--bg-subtle)] ${className}`}
      aria-hidden="true"
    />
  )
}

// Skeleton de conversa
function ConversationSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

// Skeleton de mensagem
function MessageSkeleton({ isAgent = false }) {
  return (
    <div className={`flex gap-2 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="space-y-1 max-w-[60%]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  )
}
```

---

## 4. Tipografia hierárquica

```tsx
// Escala tipográfica
// Display: 36px/bold — títulos de dashboard, métricas grandes
// H1: 24px/semibold — títulos de seção
// H2: 18px/semibold — subtítulos
// H3: 16px/medium — rótulos de card
// Body: 14px/normal — texto padrão
// Small: 13px/normal — metadados, timestamps
// Caption: 12px/normal — labels, badges

// Exemplo de hierarquia em card de métrica
function MetricCard({ label, value, delta }) {
  return (
    <div className="p-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-[var(--text-primary)] tabular-nums">
        {value}
      </p>
      {delta && (
        <p className={`mt-1 text-sm ${delta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </p>
      )}
    </div>
  )
}
```

---

## 5. Hover states e interatividade

```css
/* Botão primário */
.btn-primary {
  background: var(--brand-600);
  color: white;
  transition: all 0.15s ease;
}
.btn-primary:hover {
  background: var(--brand-500);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

/* Item de lista selecionável */
.list-item {
  transition: background 0.1s ease;
  cursor: pointer;
}
.list-item:hover {
  background: var(--bg-subtle);
}
.list-item.selected {
  background: var(--brand-100);
  border-left: 2px solid var(--brand-600);
}

/* Focus ring acessível */
.focusable:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}
```

---

## 6. Transições suaves entre estados

```tsx
// Transição de tema (dark/light)
// Aplicar no <html> ou <body>:
// transition: background-color 0.2s ease, color 0.2s ease;

// Transição de painel (lista → detalhe)
const panelVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } }
}

// Badge de status com pulse para "ativo"
function StatusBadge({ status }) {
  return (
    <span className="relative flex items-center gap-1.5">
      {status === 'active' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
        </span>
      )}
      <span className="text-xs font-medium">{status}</span>
    </span>
  )
}
```

---

## Checklist antes de entregar

- [ ] Todos os espaçamentos são múltiplos de 4px
- [ ] Dark mode funcionando em todos os estados
- [ ] Skeleton implementado para carregamentos > 200ms
- [ ] Animações respeitam `prefers-reduced-motion`
- [ ] Focus ring visível em todos os elementos interativos
- [ ] Sem cores hard-coded (apenas CSS variables)
- [ ] Hover e active states em todos os elementos clicáveis
