# Painel de Atendimentos

## Sobre o projeto

Painel web para monitorar em tempo real os atendimentos de um agente de IA via WhatsApp.
Não usa banco de dados. Armazena mensagens em arquivo JSON local.

## Stack

- Backend: Node.js com Fastify
- Frontend: React com Vite
- Comunicação tempo real: WebSocket (via fastify-websocket)
- Armazenamento: arquivo JSON local (sem banco de dados)
- Estilo: Tailwind CSS, tema escuro

## Arquitetura

- O n8n envia webhooks com mensagens do cliente e do agente IA
- A API recebe, salva em JSON e notifica o frontend via WebSocket
- O frontend exibe lista de conversas + chat em tempo real

## Payload esperado do n8n

POST /api/messages

```json
{
  "conversation_id": "5531999999999",
  "name": "Nome do cliente",
  "role": "client" | "agent",
  "message": "Texto da mensagem",
  "timestamp": "2026-03-19T14:30:00"
}
```

## Convenções

- TypeScript strict mode
- Funções documentadas com JSDoc
- Commits atômicos e descritivos
- Error handling explícito em todo endpoint
