---
name: react-dashboard
description: Padrões para o frontend do painel de atendimentos.
  Usar quando criar componentes React, layout do dashboard,
  ou lógica de WebSocket no frontend.
---

## Regras para o Frontend

### Componentes

- Functional components com hooks apenas
- Um componente por arquivo
- Nomes descritivos: ConversationList, ChatWindow, MessageBubble

### Layout do dashboard

- Sidebar esquerda: lista de conversas (max 300px largura)
- Área principal: chat aberto com mensagens
- Mensagens do cliente: bolha alinhada à esquerda, cor neutra
- Mensagens do agente: bolha alinhada à direita, cor de destaque
- Auto-scroll quando nova mensagem chega

### WebSocket no frontend

- Conectar ao montar o App
- Reconectar automaticamente se cair (retry com backoff)
- Mostrar indicador de conexão (online/offline)

### Tema

- Tema escuro por padrão
- Cores inspiradas em terminais modernos
- Fonte monospace para mensagens
- Timestamps discretos em cinza claro
