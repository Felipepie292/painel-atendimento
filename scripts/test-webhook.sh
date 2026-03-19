#!/usr/bin/env bash
# Simula uma conversa entre cliente e agente via webhook POST /api/messages
# Uso: ./scripts/test-webhook.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
CONVERSATION_ID="5531999887766"
CLIENT_NAME="João Silva"
API_KEY="${API_KEY:-}"

HEADERS=(-H "Content-Type: application/json")
if [ -n "$API_KEY" ]; then
  HEADERS+=(-H "x-api-key: $API_KEY")
fi

send_message() {
  local role="$1"
  local message="$2"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

  echo "[$role] $message"

  curl -s -o /dev/null -w "  -> HTTP %{http_code}\n" \
    -X POST "$BASE_URL/api/messages" \
    "${HEADERS[@]}" \
    -d "$(cat <<EOF
{
  "conversation_id": "$CONVERSATION_ID",
  "name": "$CLIENT_NAME",
  "role": "$role",
  "message": "$message",
  "timestamp": "$timestamp"
}
EOF
)"
}

echo "=== Teste de Webhook - Painel de Atendimentos ==="
echo "URL: $BASE_URL"
echo "Conversa: $CONVERSATION_ID ($CLIENT_NAME)"
echo ""

# Rodada 1
echo "--- Rodada 1 ---"
send_message "client" "Olá, preciso de ajuda com meu pedido #12345"
sleep 2
send_message "agent" "Olá João! Claro, vou verificar o status do seu pedido #12345. Um momento, por favor."
sleep 2

# Rodada 2
echo ""
echo "--- Rodada 2 ---"
send_message "client" "O pedido estava previsto para ontem mas não chegou"
sleep 2
send_message "agent" "Entendo sua preocupação. Verifiquei aqui e o pedido #12345 está em trânsito. A previsão atualizada de entrega é amanhã até as 18h."
sleep 2

# Rodada 3
echo ""
echo "--- Rodada 3 ---"
send_message "client" "Ok, obrigado pela informação!"
sleep 2
send_message "agent" "Por nada, João! Se precisar de mais alguma coisa é só chamar. Tenha um ótimo dia! 😊"

echo ""
echo "=== Teste concluído ==="
