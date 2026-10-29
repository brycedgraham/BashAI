#!/usr/bin/env bash
# ==============================================================================
# Installer for BashAI Native Shell Integration
# Configurable for llama.cpp (port 8888), Ollama, and OpenAI endpoints
# ==============================================================================
set -e

CFG_BACKEND="${BACKEND:-llamacpp}"
CFG_PORT="${PORT:-8888}"
CFG_ENDPOINT="${ENDPOINT:-http://localhost:$CFG_PORT}"
CFG_MODEL="${MODEL:-gemma-2b-it}"
CFG_API_KEY="${API_KEY:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --backend)
      CFG_BACKEND="$2"
      shift 2
      ;;
    --port)
      CFG_PORT="$2"
      CFG_ENDPOINT="http://localhost:$2"
      shift 2
      ;;
    --endpoint)
      CFG_ENDPOINT="$2"
      shift 2
      ;;
    --model)
      CFG_MODEL="$2"
      shift 2
      ;;
    --api-key)
      CFG_API_KEY="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo -e "\033[1;36m=================================================================\033[0m"
echo -e "\033[1;36m       BashAI Native Linux Shell Assistant Installer             \033[0m"
echo -e "\033[1;36m=================================================================\033[0m"

echo ""
echo -e "\033[1;32m==> Configuring BashAI settings:\033[0m"
echo -e "    Backend:  \033[33m$CFG_BACKEND\033[0m"
echo -e "    Endpoint: \033[33m$CFG_ENDPOINT\033[0m"
echo -e "    Model:    \033[33m$CFG_MODEL\033[0m"

mkdir -p "$HOME/.bashai"

cat <<EOF > "$HOME/.bashai/config.env"
# BashAI Configuration
export BASHAI_BACKEND="$CFG_BACKEND"
export BASHAI_ENDPOINT="$CFG_ENDPOINT"
export BASHAI_MODEL="$CFG_MODEL"
export BASHAI_API_KEY="$CFG_API_KEY"
EOF

# Embedded bashai script to guarantee zero external network dependencies
cat << 'ENDBASHAI' > "$HOME/.bashai/bashai.sh"
#!/usr/bin/env bash
if [ -f "$HOME/.bashai/config.env" ]; then
  source "$HOME/.bashai/config.env"
fi

export BASHAI_BACKEND="${BASHAI_BACKEND:-llamacpp}"
export BASHAI_ENDPOINT="${BASHAI_ENDPOINT:-http://localhost:8888}"
export BASHAI_MODEL="${BASHAI_MODEL:-gemma-2b-it}"
export BASHAI_API_KEY="${BASHAI_API_KEY:-}"

?() {
  if [ $# -eq 0 ]; then
    echo -e "\033[1;36m==> BashAI Small LLM Shell Assistant\033[0m"
    echo -e "Backend:  \033[32m$BASHAI_BACKEND\033[0m"
    echo -e "Endpoint: \033[33m$BASHAI_ENDPOINT\033[0m"
    echo -e "Model:    \033[35m$BASHAI_MODEL\033[0m"
    echo ""
    echo -e "Usage: \033[33m? <plain english request>\033[0m"
    echo -e "Example: \033[32m? restart nginx and check logs\033[0m"
    return 0
  fi

  local QUERY="$*"
  local CURRENT_DIR="$PWD"

  echo -e "\033[0;36m[BashAI]\033[0m Consulting $BASHAI_BACKEND on $BASHAI_ENDPOINT ($BASHAI_MODEL)..."
  local SYS_PROMPT="You are a Linux sysadmin bash generator. Current directory: $CURRENT_DIR. Translate: '$QUERY' into a single bash command. Return JSON ONLY with fields: {\"command\": \"...\", \"explanation\": \"...\", \"safetyLevel\": \"safe|warning|destructive\"}"

  local RESULT=""
  local CMD=""
  local EXPLANATION=""
  local SAFETY=""
  local BASE_ENDPOINT="${BASHAI_ENDPOINT%/}"
  BASE_ENDPOINT="${BASE_ENDPOINT%/v1}"

  # llama.cpp or OpenAI-compatible backend
  if [ "$BASHAI_BACKEND" = "llamacpp" ] || [ "$BASHAI_BACKEND" = "openai" ] || [[ "$BASHAI_ENDPOINT" == *":8888"* ]]; then
    local HEADERS=(-H "Content-Type: application/json")
    if [ -n "$BASHAI_API_KEY" ]; then
      HEADERS+=(-H "Authorization: Bearer $BASHAI_API_KEY")
    fi
    local JSON_PAYLOAD=$(python3 -c "import json, sys; print(json.dumps({'model': sys.argv[1], 'messages': [{'role': 'system', 'content': sys.argv[2]}, {'role': 'user', 'content': sys.argv[3]}], 'temperature': 0.1, 'response_format': {'type': 'json_object'}}))" "$BASHAI_MODEL" "$SYS_PROMPT" "$QUERY" 2>/dev/null)
    local RAW_RESP=$(curl -s --connect-timeout 4 -X POST "$BASE_ENDPOINT/v1/chat/completions" "${HEADERS[@]}" -d "$JSON_PAYLOAD" 2>/dev/null)
    if [ -n "$RAW_RESP" ]; then
      RESULT=$(python3 -c "import json, sys
try:
    d = json.loads(sys.argv[1])
    c = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(c)
except Exception:
    pass" "$RAW_RESP" 2>/dev/null)
    fi
  fi

  # Ollama backend fallback
  if [ -z "$RESULT" ] && ([ "$BASHAI_BACKEND" = "ollama" ] || [[ "$BASHAI_ENDPOINT" == *":11434"* ]]); then
    if curl -s --connect-timeout 1 "$BASE_ENDPOINT/api/tags" >/dev/null 2>&1; then
      local PROMPT_BODY=$(python3 -c "import json, sys; print(json.dumps({'model': sys.argv[1], 'prompt': sys.argv[2], 'stream': False, 'format': 'json'}))" "$BASHAI_MODEL" "<start_of_turn>user\n$SYS_PROMPT\n<end_of_turn>\n<start_of_turn>model\n" 2>/dev/null)
      local RAW_RESP=$(curl -s --connect-timeout 4 -X POST "$BASE_ENDPOINT/api/generate" -H "Content-Type: application/json" -d "$PROMPT_BODY" 2>/dev/null)
      RESULT=$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('response', ''))" "$RAW_RESP" 2>/dev/null)
    fi
  fi

  if [ -n "$RESULT" ]; then
    CMD=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    data = json.loads(m.group(0)) if m else {}
print(data.get('command', ''))" "$RESULT" 2>/dev/null)

    EXPLANATION=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    data = json.loads(m.group(0)) if m else {}
print(data.get('explanation', ''))" "$RESULT" 2>/dev/null)

    SAFETY=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    data = json.loads(m.group(0)) if m else {}
print(data.get('safetyLevel', 'safe'))" "$RESULT" 2>/dev/null)
  fi

  if [ -z "$CMD" ]; then
    echo -e "\033[1;31m[!] Could not connect to llama.cpp on $BASHAI_ENDPOINT\033[0m"
    echo -e "Make sure llama-server is running: \033[36mllama-server -m your_model.gguf --port 8888\033[0m"
    return 1
  fi

  echo -e ""
  echo -e "\033[1;30m┌─────────────────────────────────────────────────────────────────┐\033[0m"
  if [ "$SAFETY" = "destructive" ]; then
    echo -e "\033[1;30m│\033[0m \033[1;31m[!] HIGH RISK / DESTRUCTIVE\033[0m                                     \033[1;30m│\033[0m"
  elif [ "$SAFETY" = "warning" ]; then
    echo -e "\033[1;30m│\033[0m \033[1;33m[!] ELEVATED RISK\033[0m                                               \033[1;30m│\033[0m"
  else
    echo -e "\033[1;30m│\033[0m \033[1;32m[✓] SAFE (Read-Only / Nominal)\033[0m                                  \033[1;30m│\033[0m"
  fi
  echo -e "\033[1;30m├─────────────────────────────────────────────────────────────────┤\033[0m"
  echo -e "\033[1;30m│\033[0m \033[1;37mCommand:\033[0m \033[1;36m$CMD\033[0m"
  echo -e "\033[1;30m│\033[0m \033[0;37mDetails:\033[0m $EXPLANATION"
  echo -e "\033[1;30m└─────────────────────────────────────────────────────────────────┘\033[0m"
  echo -e ""

  read -p $'\033[1m[Enter]\033[0m Execute in shell  |  \033[1m[e]\033[0m Edit command  |  \033[1m[q]\033[0m Cancel: ' ACTION
  case "$ACTION" in
    ""|"y"|"Y")
      echo -e "\033[0;32m==> Running:\033[0m $CMD"
      echo ""
      history -s "$CMD"
      eval "$CMD"
      ;;
    "e"|"E")
      echo ""
      history -s "$CMD"
      echo -e "Command loaded into history. Press \033[1;33m[Up Arrow]\033[0m to edit and execute:"
      echo -e "\033[1;36m$CMD\033[0m"
      ;;
    *)
      echo -e "\033[0;31mCancelled.\033[0m"
      ;;
  esac
}
ENDBASHAI

chmod +x "$HOME/.bashai/bashai.sh"

if ! grep -q "bashai.sh" "$HOME/.bashrc" 2>/dev/null; then
  echo "" >> "$HOME/.bashrc"
  echo "# BashAI Natural Language Shell Integration" >> "$HOME/.bashrc"
  echo '[ -f "$HOME/.bashai/bashai.sh" ] && source "$HOME/.bashai/bashai.sh"' >> "$HOME/.bashrc"
fi

if [ -f "$HOME/.zshrc" ] && ! grep -q "bashai.sh" "$HOME/.zshrc" 2>/dev/null; then
  echo "" >> "$HOME/.zshrc"
  echo "# BashAI Natural Language Shell Integration" >> "$HOME/.zshrc"
  echo '[ -f "$HOME/.bashai/bashai.sh" ] && source "$HOME/.bashai/bashai.sh"' >> "$HOME/.zshrc"
fi

echo ""
echo -e "\033[1;32m[✓] BashAI installed successfully for llama.cpp on port $CFG_PORT!\033[0m"
echo -e "To activate now in your active SSH session, run:"
echo -e "  \033[1;33msource ~/.bashrc\033[0m"
echo ""
echo -e "Then type your queries with the \033[1;36m?\033[0m prefix:"
echo -e "  \033[1;36m? check listening ports\033[0m"
echo -e "  \033[1;36m? find files larger than 100MB in /var/log\033[0m"
