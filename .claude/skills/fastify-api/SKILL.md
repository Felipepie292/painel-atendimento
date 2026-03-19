---
name: fastify-api
description: Padrões e boas práticas para APIs com Fastify.
  Usar quando criar rotas, validação de payload,
  tratamento de erros ou configuração do servidor.
---

## Regras para API Fastify

### Estrutura de rotas

- Todas as rotas ficam em /src/routes/
- Cada arquivo exporta uma função que registra as rotas
- Usar schema validation do Fastify em todo POST/PUT

### Validação de payload

- Sempre usar JSON Schema para validar inputs
- Retornar 400 com mensagem clara quando payload inválido
- Nunca confiar em dados do webhook sem validar

### Tratamento de erros

- Wrap every route handler in try/catch
- Log o erro completo no servidor
- Retornar mensagem genérica pro cliente (nunca expor stack trace)
- Usar códigos HTTP corretos: 200, 201, 400, 404, 500

### WebSocket

- Usar fastify-websocket
- Broadcast para todos os clientes conectados quando nova mensagem chega
- Implementar heartbeat ping/pong a cada 30 segundos
- Tratar desconexões gracefully
