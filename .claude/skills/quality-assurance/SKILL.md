# Skill: Quality Assurance

Checklist completo de qualidade, segurança e testes para o painel de atendimentos.

---

## 1. Checklist de Segurança

### XSS (Cross-Site Scripting)

```typescript
// ❌ PERIGOSO — renderização direta de HTML
<div dangerouslySetInnerHTML={{ __html: message.content }} />

// ✅ SEGURO — React escapa automaticamente
<div>{message.content}</div>

// ✅ Se precisar renderizar markdown, use uma lib que sanitiza:
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(markdownHtml)
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

**O que verificar:**
- [ ] Nenhum `dangerouslySetInnerHTML` sem sanitização
- [ ] Dados do usuário nunca inseridos em `eval()`, `new Function()`, ou `setTimeout(string)`
- [ ] URLs de redirecionamento validadas (`javascript:` bloqueado)
- [ ] Content-Security-Policy configurado no Fastify

### SQL/NoSQL Injection

Não aplicável (sem banco de dados). Verificar apenas:
- [ ] Dados do webhook não usados em `eval()` ou template strings executadas
- [ ] `conversation_id` e `name` sanitizados antes de salvar no JSON

### Autenticação e Autorização

```typescript
// Verificar em TODOS os endpoints protegidos:
// 1. API key para webhooks do n8n
fastify.addHook('onRequest', async (req, reply) => {
  const key = req.headers['x-api-key']
  if (key !== process.env.API_KEY) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
})

// 2. Sessão HMAC para o painel web
// 3. Variáveis de ambiente nunca expostas no frontend
// 4. process.env.API_KEY e process.env.PANEL_PASSWORD nunca logados
```

**O que verificar:**
- [ ] Todos os endpoints `/api/*` têm autenticação
- [ ] Nenhuma variável de ambiente sensível enviada ao cliente
- [ ] Tokens de sessão têm expiração
- [ ] Timeout de inatividade implementado

### CORS

```typescript
// ❌ PERIGOSO em produção
origin: true  // aceita qualquer origem

// ✅ CORRETO
origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
```

**O que verificar:**
- [ ] CORS_ORIGIN definido no Railway para a URL de produção
- [ ] Não usar `origin: '*'` em produção com credenciais
- [ ] Métodos permitidos apenas os necessários (GET, POST)

### Headers de Segurança

```typescript
// Adicionar ao Fastify:
import helmet from '@fastify/helmet'
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:'],  // WebSocket
    }
  }
})
```

---

## 2. Edge Cases de WebSocket

**O que verificar:**

```typescript
// ❌ Sem validação — crash se payload inválido
ws.on('message', (data) => {
  const parsed = JSON.parse(data)  // throw se não for JSON
  processMessage(parsed.type, parsed.payload)  // undefined access
})

// ✅ Com validação defensiva
ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString())
    if (!parsed?.type) return  // ignora mensagens malformadas
    processMessage(parsed.type, parsed.payload)
  } catch {
    // ignora — cliente enviou dados inválidos
  }
})
```

**Checklist:**
- [ ] `JSON.parse` sempre em try/catch
- [ ] Verificar `ws.readyState === WebSocket.OPEN` antes de `ws.send()`
- [ ] Heartbeat implementado (conexões zumbis detectadas)
- [ ] Reconexão automática no frontend com backoff
- [ ] Limite de tamanho de mensagem configurado (`maxPayload`)
- [ ] Cleanup de listeners no `close` e `error`

---

## 3. Validação de Payload (Webhook do n8n)

```typescript
// Schema esperado (do CLAUDE.md)
const messageSchema = {
  type: 'object',
  required: ['conversation_id', 'name', 'role', 'message', 'timestamp'],
  properties: {
    conversation_id: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    role: { type: 'string', enum: ['client', 'agent'] },
    message: { type: 'string', minLength: 1, maxLength: 10000 },
    timestamp: { type: 'string', format: 'date-time' }
  },
  additionalProperties: false  // rejeita campos extras
}
```

**O que verificar:**
- [ ] Schema de validação em todos os endpoints POST
- [ ] `additionalProperties: false` para evitar poluição de dados
- [ ] Limite de tamanho em campos de texto
- [ ] `timestamp` validado como ISO 8601
- [ ] `conversation_id` não permite path traversal (`../`, `/`, etc.)

---

## 4. Acessibilidade (WCAG 2.1 AA)

```tsx
// ❌ Inacessível
<div onClick={handleClick}>Abrir conversa</div>

// ✅ Acessível
<button
  onClick={handleClick}
  aria-label="Abrir conversa com João Silva"
  className="focus-visible:ring-2 focus-visible:ring-brand"
>
  Abrir conversa
</button>
```

**Checklist:**
- [ ] Todos elementos clicáveis são `<button>` ou `<a>` (não `<div onClick>`)
- [ ] Imagens têm `alt` descritivo (ou `alt=""` se decorativas)
- [ ] Contraste de texto mínimo 4.5:1 (normal) e 3:1 (grande)
- [ ] Focus ring visível em modo teclado (`focus-visible`)
- [ ] Formulários têm `<label>` associado a cada `<input>`
- [ ] Modais têm `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Loading states têm `aria-live="polite"` ou `aria-busy="true"`
- [ ] Ícones decorativos têm `aria-hidden="true"`
- [ ] Ordem do Tab lógica e consistente com a ordem visual

---

## 5. Performance

### React

```typescript
// ❌ Re-render desnecessário
function ConversationList({ conversations }) {
  return conversations.map(conv => (
    <ConversationItem key={conv.id} data={conv} onClick={() => select(conv)} />
    //                                                  ^^^ nova função a cada render!
  ))
}

// ✅ Com useCallback
const handleSelect = useCallback((conv) => select(conv), [select])
```

**Checklist:**
- [ ] Listas longas usam `key` estável (não índice do array)
- [ ] `useCallback` em handlers passados a listas
- [ ] `useMemo` em computações pesadas (filtros, ordenação de listas)
- [ ] Componentes grandes divididos (lazy loading com `React.lazy`)
- [ ] Sem re-renders desnecessários em updates de WebSocket
  - WebSocket deve atualizar apenas a conversa afetada, não recarregar a lista inteira

### Bundle

- [ ] Sem dependências de desenvolvimento no bundle de produção
- [ ] Imagens otimizadas (sem PNGs grandes desnecessários)
- [ ] Framer Motion importado seletivamente (`import { motion } from 'framer-motion'`)

---

## 6. Responsividade

**Breakpoints a testar:**

| Dispositivo | Largura | O que verificar |
|-------------|---------|-----------------|
| Mobile S    | 320px   | Layout não quebra, texto legível |
| Mobile L    | 414px   | Lista de conversas usável |
| Tablet      | 768px   | Painel split (lista + detalhe) |
| Desktop     | 1280px+ | Layout completo, analytics visível |

**Checklist:**
- [ ] Nenhum elemento com `overflow: hidden` cortando conteúdo em mobile
- [ ] Touch targets mínimo 44x44px
- [ ] Texto não menor que 14px em mobile
- [ ] Scroll horizontal ausente (exceto em tabelas com overflow-x: auto)

---

## 7. Tratamento de Erros

```typescript
// ❌ Erro silencioso
async function loadData() {
  const res = await fetch('/api/conversations')
  const data = await res.json()
  setConversations(data)
}

// ✅ Com tratamento
async function loadData() {
  try {
    const res = await fetch('/api/conversations')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    setConversations(data)
  } catch (err) {
    console.error('[loadData]', err)
    setError('Falha ao carregar conversas. Tente novamente.')
  }
}
```

**Checklist:**
- [ ] Todos os `fetch` têm try/catch com feedback ao usuário
- [ ] Estado de erro visível na UI (não apenas console)
- [ ] Erro 401 redireciona para login
- [ ] Erro 500 mostra mensagem genérica (não stack trace)
- [ ] Backend não vaza detalhes internos em respostas de erro

---

## Formato do relatório

Ao reportar problemas, use este formato:

```
## Auditoria QA — [data]

### CRÍTICO
- **[arquivo:linha]** Descrição do problema
  Risco: [o que pode acontecer]
  Correção: [como resolver]

### ALTO
- ...

### MÉDIO
- ...

### BAIXO
- ...

### Aprovado ✓
- [Lista do que foi verificado e está OK]
```
