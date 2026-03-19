# Painel de Atendimentos

Painel web para monitorar em tempo real os atendimentos de um agente de IA via WhatsApp. Recebe mensagens do n8n via webhook e exibe em um dashboard com chat em tempo real.

## Stack

- **Backend:** Node.js + Fastify + WebSocket
- **Frontend:** React + Vite + Tailwind CSS
- **Armazenamento:** arquivo JSON local (sem banco de dados)
- **Deploy:** Docker

## Deploy com Docker (recomendado)

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
PORT=3001
API_KEY=sua-chave-secreta-aqui
CORS_ORIGIN=https://seu-dominio.com
NODE_ENV=production
```

### 2. Build e iniciar

```bash
docker compose up -d --build
```

O painel estará disponível em `http://seu-servidor:3001`.

### 3. Verificar status

```bash
# Ver logs
docker compose logs -f painel

# Health check
curl http://localhost:3001/health
```

### 4. Atualizar

```bash
git pull
docker compose up -d --build
```

## Deploy manual (sem Docker)

### Requisitos

- Node.js 22+

### Instalar e buildar

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..

# Build tudo
npm run build
```

### Rodar em produção

```bash
NODE_ENV=production PORT=3001 API_KEY=sua-chave node dist/server.js
```

## Desenvolvimento local

```bash
# Instalar dependências
npm install
cd frontend && npm install && cd ..

# Rodar backend + frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## API

### POST /api/messages

Recebe mensagens do n8n. Se `API_KEY` estiver configurada, requer header `x-api-key`.

```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave" \
  -d '{
    "conversation_id": "5531999999999",
    "name": "Nome do cliente",
    "role": "client",
    "message": "Texto da mensagem",
    "timestamp": "2026-03-19T14:30:00.000Z"
  }'
```

### GET /api/conversations

Lista todas as conversas com resumo.

### GET /api/conversations/:id

Retorna todas as mensagens de uma conversa.

### GET /health

Health check para Docker/load balancer.

### WebSocket /ws

Conexão em tempo real. Recebe eventos:

```json
{ "type": "connected" }
{ "type": "new_message", "data": { ... } }
```

## Configuração do n8n

No seu workflow n8n, adicione um nó HTTP Request:

- **Method:** POST
- **URL:** `http://seu-servidor:3001/api/messages`
- **Headers:** `x-api-key: sua-chave` (se configurado)
- **Body (JSON):**

```json
{
  "conversation_id": "{{ $json.phone }}",
  "name": "{{ $json.name }}",
  "role": "client",
  "message": "{{ $json.message }}",
  "timestamp": "{{ $now.toISO() }}"
}
```

## Testar com dados simulados

```bash
./scripts/test-webhook.sh
# ou com API key
API_KEY=sua-chave ./scripts/test-webhook.sh
```

## Estrutura do projeto

```
├── src/
│   ├── server.ts              # Entry point Fastify
│   ├── routes/
│   │   ├── messages.ts        # POST /api/messages
│   │   ├── conversations.ts   # GET /api/conversations
│   │   └── websocket.ts       # WebSocket /ws
│   ├── services/
│   │   ├── storage.ts         # Leitura/escrita JSON
│   │   └── websocket.ts       # Broadcast WebSocket
│   └── types/
│       └── index.ts           # Interfaces TypeScript
├── frontend/                  # React + Vite + Tailwind
├── data/                      # Mensagens (JSON)
├── scripts/                   # Scripts utilitários
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Deploy com Docker
└── .env.example               # Variáveis de ambiente
```
