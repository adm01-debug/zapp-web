#!/bin/bash
# Setup do cron job para renovação automática do token Lalamove UAPI
# Executa o token manager a cada 20h para garantir tokens sempre frescos

SCRIPT_PATH="/opt/lalamove/token_manager.py"
LOG_PATH="/var/log/lalamove_token.log"
SESSION_PATH="/var/lib/lalamove/session.json"
PLAYWRIGHT_SCRIPT="/opt/lalamove/lalamove_login_v6.js"

echo "=== Instalando Lalamove Token Manager ==="

# Criar diretórios
mkdir -p /opt/lalamove /var/log /var/lib/lalamove

# Copiar scripts
cp /home/claude/lalamove_token_manager.py "$SCRIPT_PATH"
cp /tmp/lalamove_login_v6.js "$PLAYWRIGHT_SCRIPT"
cp /tmp/proxy_config.json /opt/lalamove/proxy_config.json

# Atualizar variáveis de ambiente no script
export LALAMOVE_SESSION_FILE="$SESSION_PATH"
export LALAMOVE_LOG_FILE="$LOG_PATH"

# Instalar cron job (a cada 20 horas = 0h e 20h = duas vezes por dia)
# Usando at (mais flexível) ou cron tradicional
CRON_LINE="0 0,20 * * * LALAMOVE_SESSION_FILE=$SESSION_PATH LALAMOVE_LOG_FILE=$LOG_PATH /usr/bin/python3 $SCRIPT_PATH --refresh >> $LOG_PATH 2>&1"

# Adicionar ao crontab
(crontab -l 2>/dev/null | grep -v "lalamove"; echo "$CRON_LINE") | crontab -

echo "✅ Cron job instalado: renovação às 00h e 20h"
echo ""
echo "Crontab atual:"
crontab -l

# Fazer primeiro login
echo ""
echo "=== Fazendo login inicial ==="
LALAMOVE_SESSION_FILE="$SESSION_PATH" python3 "$SCRIPT_PATH" --refresh
