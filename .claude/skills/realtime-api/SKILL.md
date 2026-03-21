# Skill: Realtime API

Padrões para APIs de tempo real, WebSocket robusto e exportação de dados no painel de atendimentos.

---

## 1. WebSocket com Heartbeat

Mantenha conexões vivas e detecte clientes desconectados silenciosamente.

```typescript
// backend/src/websocket.ts
import { WebSocket } from 'ws'

interface AliveSocket extends WebSocket {
  isAlive: boolean
  clientId: string
}

const clients = new Map<string, AliveSocket>()

// Heartbeat a cada 30s
const heartbeatInterval = setInterval(() => {
  clients.forEach((ws, id) => {
    if (!ws.isAlive) {
      clients.delete(id)
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  })
}, 30_000)

// Handler de conexão
function handleConnection(ws: AliveSocket, clientId: string) {
  ws.isAlive = true
  ws.clientId = clientId
  clients.set(clientId, ws)

  ws.on('pong', () => { ws.isAlive = true })

  ws.on('close', () => {
    clients.delete(clientId)
  })

  ws.on('error', (err) => {
    console.error(`[WS] Error for client ${clientId}:`, err.message)
    clients.delete(clientId)
  })
}

// Broadcast com fallback de erro
function broadcast(data: unknown) {
  const payload = JSON.stringify(data)
  clients.forEach((ws, id) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload, (err) => {
        if (err) {
          console.error(`[WS] Send error for client ${id}:`, err.message)
          clients.delete(id)
        }
      })
    }
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval)
  clients.forEach(ws => ws.close(1001, 'Server shutting down'))
})
```

---

## 2. Reconnection com Exponential Backoff (frontend)

```typescript
// frontend/src/hooks/useWebSocket.ts
const BASE_DELAY = 1_000   // 1s
const MAX_DELAY  = 30_000  // 30s
const MAX_RETRIES = 10

function useWebSocket(url: string, onMessage: (data: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0
      console.log('[WS] Connected')
    }

    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data))
      } catch { /* ignore malformed */ }
    }

    ws.onclose = (e) => {
      if (e.code === 1001) return // server shutdown intencional
      if (retriesRef.current >= MAX_RETRIES) return

      const delay = Math.min(BASE_DELAY * 2 ** retriesRef.current, MAX_DELAY)
      retriesRef.current++
      timerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [url, onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(timerRef.current)
      wsRef.current?.close(1000, 'Component unmounted')
    }
  }, [connect])

  return wsRef
}
```

---

## 3. Rate Limiting

```typescript
// backend/src/plugins/rateLimiter.ts
import fp from 'fastify-plugin'

interface RateEntry { count: number; resetAt: number }
const store = new Map<string, RateEntry>()

// Limpa entradas expiradas a cada minuto
setInterval(() => {
  const now = Date.now()
  store.forEach((v, k) => { if (v.resetAt < now) store.delete(k) })
}, 60_000)

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    // Apenas rotas POST /api/*
    if (!req.url.startsWith('/api/') || req.method !== 'POST') return

    const key = req.headers['x-api-key'] as string || req.ip
    const now = Date.now()
    const window = 60_000 // 1 minuto
    const limit = 100     // 100 req/min

    let entry = store.get(key)
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + window }
    }
    entry.count++
    store.set(key, entry)

    reply.header('X-RateLimit-Limit', limit)
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - entry.count))
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000))

    if (entry.count > limit) {
      return reply.code(429).send({ error: 'Too many requests' })
    }
  })
})
```

---

## 4. Compressão de Payload WebSocket

Para payloads grandes (lista de conversas), envie apenas delta/diff:

```typescript
// Enviar apenas conversa atualizada, não lista completa
function notifyConversationUpdate(conversation: Conversation) {
  broadcast({
    type: 'conversation:update',   // vs 'conversations:all'
    payload: conversation
  })
}

// Tipos de evento padronizados
type WSEvent =
  | { type: 'conversation:update'; payload: Conversation }
  | { type: 'conversation:new';    payload: Conversation }
  | { type: 'message:new';         payload: { conversationId: string; message: Message } }
  | { type: 'metrics:update';      payload: Metrics }
  | { type: 'ping' }
```

---

## 5. Health Check Detalhado

```typescript
// GET /health
fastify.get('/health', async (req, reply) => {
  const uptime = process.uptime()
  const memUsage = process.memoryUsage()

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    websocket: {
      activeConnections: clients.size,
    },
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    storage: {
      file: DATA_FILE,
      exists: await fs.access(DATA_FILE).then(() => true).catch(() => false),
    }
  }
})
```

---

## 6. Exportação CSV com BOM UTF-8

BOM garante que Excel abre o arquivo corretamente com acentuação.

```typescript
// GET /api/export/csv?from=2026-01-01&to=2026-03-31
fastify.get('/api/export/csv', { onRequest: [authenticate] }, async (req, reply) => {
  const { from, to } = req.query as { from?: string; to?: string }

  const conversations = await loadConversations()
  const filtered = filterByDateRange(conversations, from, to)

  const rows = filtered.flatMap(conv =>
    conv.messages.map(msg => ({
      conversation_id: conv.id,
      client_name: conv.name,
      role: msg.role,
      message: msg.content.replace(/"/g, '""'), // escape aspas
      timestamp: msg.timestamp,
      tags: conv.tags?.join('; ') ?? '',
      satisfaction_score: conv.satisfactionScore ?? '',
    }))
  )

  const headers = Object.keys(rows[0] ?? {})
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => `"${(row as Record<string, string>)[h] ?? ''}"`).join(',')
    )
  ]

  // BOM UTF-8 (\uFEFF) para compatibilidade com Excel
  const csv = '\uFEFF' + csvLines.join('\r\n')

  const filename = `atendimentos-${from ?? 'all'}-${to ?? 'all'}.csv`
  reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csv)
})
```

---

## 7. Graceful Shutdown

```typescript
// backend/src/server.ts
async function gracefulShutdown(signal: string) {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`)

  // 1. Fechar novas conexões
  await fastify.close()

  // 2. Notificar WebSocket clients
  clients.forEach(ws => ws.close(1001, 'Server shutting down'))
  clearInterval(heartbeatInterval)

  // 3. Aguardar escritas pendentes (mutex)
  await mutex.waitForUnlock()

  console.log('[Server] Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
```

---

## 8. Escrita Atômica de JSON

```typescript
import { writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { Mutex } from 'async-mutex'

const mutex = new Mutex()

async function saveConversations(data: Conversation[]) {
  await mutex.runExclusive(async () => {
    const tmpFile = join(tmpdir(), `conversations-${Date.now()}.json`)
    await writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8')
    await rename(tmpFile, DATA_FILE) // operação atômica no mesmo filesystem
  })
}
```

---

## Checklist antes de entregar

- [ ] WebSocket tem heartbeat configurado (30s)
- [ ] Frontend tem reconnection com backoff exponencial
- [ ] Rate limiting aplicado em rotas POST
- [ ] Health check retorna conexões WebSocket ativas
- [ ] Exports CSV têm BOM UTF-8
- [ ] Graceful shutdown fecha conexões ordenadamente
- [ ] Escritas JSON usam mutex + temp file + rename
- [ ] Logs estruturados (sem `console.log` em produção, use `fastify.log`)
