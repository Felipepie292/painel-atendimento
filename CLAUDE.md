# Painel de Atendimentos

## Sobre o projeto

Painel web para monitorar em tempo real os atendimentos de um agente de IA via WhatsApp.
O painel é complementar ao n8n — não substitui o fluxo de automação, apenas exibe e organiza os atendimentos.

## Deploy

- **Produção:** https://painel-atendimento-production.up.railway.app
- **Plataforma:** Railway (Docker)
- **Repositório:** https://github.com/Felipepie292/painel-atendimento

### Variáveis de ambiente (Railway)

| Variável | Descrição |
|---|---|
| `API_KEY` | Token para autenticar webhooks do n8n (header `X-Api-Key`) |
| `PANEL_PASSWORD` | Senha de acesso ao painel web (tela de login) |
| `CORS_ORIGIN` | Origem permitida para CORS (URL do Railway em produção) |
| `NODE_ENV` | `production` no Railway |

> **Não definir `PORT`** — o Railway injeta automaticamente.

## Stack

- **Backend:** Node.js com Fastify 5
- **Frontend:** React 19 com Vite 8
- **Comunicação tempo real:** WebSocket (via @fastify/websocket)
- **Armazenamento:** arquivo JSON local (sem banco de dados)
- **Estilo:** Tailwind CSS v4, tema escuro/claro
- **Auth:** HMAC token (sessão) + API key (webhooks)

## Arquitetura

- O n8n envia webhooks POST /api/messages com mensagens do cliente e do agente IA
- Dois pontos de captura no n8n: após o Set (mensagem do cliente) e após o agente (resposta da IA)
- A API recebe, salva em JSON e notifica o frontend via WebSocket
- O frontend exibe lista de conversas + chat em tempo real

### Funcionalidades

- **Login:** tela de autenticação com senha (PANEL_PASSWORD)
- **Tags automáticas:** detecta Risco de churn, Comercial, Suporte, Elogio, Urgente
- **Score de satisfação:** 0-100 baseado em análise de palavras positivas/negativas
- **Analytics:** distribuição horária/diária, ranking de tags, tendências
- **Notificações:** browser notifications + som quando nova mensagem
- **Export:** CSV e relatório por período
- **Atalhos de teclado:** K/J (navegar), Escape (voltar)
- **Métricas em tempo real:** atendimentos ativos, tempo médio, total, taxa de resolução

## Payload esperado do n8n

POST /api/messages

Header: `X-Api-Key: <valor do API_KEY>`

```json
{
  "conversation_id": "5531999999999",
  "name": "Nome do cliente",
  "role": "client" | "agent",
  "message": "Texto da mensagem",
  "timestamp": "2026-03-19T14:30:00"
}
```

## Decisões de arquitetura

### Por que não usamos banco de dados

Simplicidade. O volume esperado é de até ~20 atendimentos/dia. Um arquivo JSON local atende sem overhead de setup, manutenção ou custo de um banco. Escrita atômica (temp file + rename) e mutex garantem integridade. Se o volume crescer significativamente, migrar para SQLite ou PostgreSQL.

### Por que Railway e não VPS

O projeto precisa centralizar atendimentos de múltiplas VPS rodando n8n. Um serviço no Railway com URL pública permite que qualquer instância de n8n envie webhooks para o mesmo painel, sem configurar rede entre VPS. Além disso: deploy automático via GitHub, SSL incluso, e escalabilidade simples.

### O painel é complementar ao n8n

O n8n continua sendo o motor de automação (recebe mensagens do WhatsApp, processa com IA, responde). O painel apenas observa — recebe cópias das mensagens via webhook e exibe para monitoramento humano. Não interfere no fluxo do n8n.

## Convenções

- TypeScript strict mode
- Funções documentadas com JSDoc
- Commits atômicos e descritivos
- Error handling explícito em todo endpoint
