#!/usr/bin/env bash
# ==============================================================================
# BashAI Native Shell Integration
# Works identically in both ZSH and BASH
# Configured for llama.cpp on port 8888 (OpenAI-compatible) and Ollama
# ==============================================================================

# Load persistent user configuration if present
if [ -f "$HOME/.bashai/config.env" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.bashai/config.env"
fi

export BASHAI_BACKEND="${BASHAI_BACKEND:-llamacpp}"
export BASHAI_ENDPOINT="${BASHAI_ENDPOINT:-http://localhost:8888}"
export BASHAI_MODEL="${BASHAI_MODEL:-gemma-2b-it}"
export BASHAI_API_KEY="${BASHAI_API_KEY:-}"

bashai() {
  # Dynamically reload user configuration if modified
  if [ -f "$HOME/.bashai/config.env" ]; then
    source "$HOME/.bashai/config.env"
  fi

  if [ $# -eq 0 ]; then
    echo -e "\033[1;36m==> BashAI Small LLM Shell Assistant\033[0m"
    echo -e "Backend:  \033[32m$BASHAI_BACKEND\033[0m"
    echo -e "Endpoint: \033[33m$BASHAI_ENDPOINT\033[0m"
    echo -e "Model:    \033[35m$BASHAI_MODEL\033[0m"
    echo ""
    echo -e "Usage:   \033[33m? <plain english query>\033[0m or \033[33mai <query>\033[0m"
    echo -e "Example: \033[32m? restart nginx and check logs\033[0m"
    echo -e "Config:  \033[34m? config\033[0m (or edit \033[34m~/.bashai/config.env\033[0m)"
    return 0
  fi

  # Interactive configuration viewer and prompt
  if [ "$1" = "config" ] || [ "$1" = "--config" ]; then
    echo -e "\033[1;36m==> BashAI Configuration\033[0m"
    echo -e "Backend:  \033[32m$BASHAI_BACKEND\033[0m"
    echo -e "Endpoint: \033[33m$BASHAI_ENDPOINT\033[0m"
    echo -e "Model:    \033[35m$BASHAI_MODEL\033[0m"
    if [ -n "$BASHAI_API_KEY" ]; then
      echo -e "API Key:  \033[33m[Configured]\033[0m"
    else
      echo -e "API Key:  \033[33m[None]\033[0m"
    fi
    echo -e "File:     \033[34m$HOME/.bashai/config.env\033[0m"
    echo ""
    printf "Do you want to reconfigure these values now? [y/N]: "
    read -r RECONF
    case "$RECONF" in
      "y"|"Y")
        printf "Enter Endpoint [%s]: " "$BASHAI_ENDPOINT"
        read -r NEW_EP
        [ -n "$NEW_EP" ] && BASHAI_ENDPOINT="$NEW_EP"

        printf "Enter Model [%s]: " "$BASHAI_MODEL"
        read -r NEW_MOD
        [ -n "$NEW_MOD" ] && BASHAI_MODEL="$NEW_MOD"

        printf "Enter API Key (press Enter if none): "
        read -r NEW_KEY
        [ -n "$NEW_KEY" ] && BASHAI_API_KEY="$NEW_KEY"

        cat <<EOFCONFIG > "$HOME/.bashai/config.env"
export BASHAI_BACKEND="$BASHAI_BACKEND"
export BASHAI_ENDPOINT="$BASHAI_ENDPOINT"
export BASHAI_MODEL="$BASHAI_MODEL"
export BASHAI_API_KEY="$BASHAI_API_KEY"
EOFCONFIG
        echo -e "\033[1;32m[✓] Settings updated in ~/.bashai/config.env\033[0m"
        ;;
      *)
        echo -e "No changes made."
        ;;
    esac
    return 0
  fi

  local QUERY="$*"
  local CURRENT_DIR="$PWD"

  echo -e "\033[0;36m[BashAI]\033[0m Consulting $BASHAI_BACKEND on $BASHAI_ENDPOINT ($BASHAI_MODEL)..."

  local SYS_PROMPT="You are a Linux sysadmin assistant. Current dir: $CURRENT_DIR. Translate: '$QUERY' into a single bash command. Return JSON ONLY with fields: {\"command\": \"...\", \"explanation\": \"...\", \"safetyLevel\": \"safe|warning|destructive\"}"

  local RESULT=""
  local CMD=""
  local EXPLANATION=""
  local SAFETY=""
  local BASE_ENDPOINT="${BASHAI_ENDPOINT%/}"
  BASE_ENDPOINT="${BASE_ENDPOINT%/v1}"

  # 1. llama.cpp or OpenAI-compatible backend (/v1/chat/completions)
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

  # 2. Ollama backend (/api/generate)
  if [ -z "$RESULT" ] && ([ "$BASHAI_BACKEND" = "ollama" ] || [[ "$BASHAI_ENDPOINT" == *":11434"* ]]); then
    if curl -s --connect-timeout 1 "$BASE_ENDPOINT/api/tags" >/dev/null 2>&1; then
      local PROMPT_BODY=$(python3 -c "import json, sys; print(json.dumps({'model': sys.argv[1], 'prompt': sys.argv[2], 'stream': False, 'format': 'json'}))" "$BASHAI_MODEL" "<start_of_turn>user\n$SYS_PROMPT\n<end_of_turn>\n<start_of_turn>model\n" 2>/dev/null)
      local RAW_RESP=$(curl -s --connect-timeout 4 -X POST "$BASE_ENDPOINT/api/generate" -H "Content-Type: application/json" -d "$PROMPT_BODY" 2>/dev/null)
      RESULT=$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('response', ''))" "$RAW_RESP" 2>/dev/null)
    fi
  fi

  # Parse JSON result safely
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
    echo -e "Make sure llama-server is running on port 8888:"
    echo -e "  \033[36mllama-server -m your_model.gguf --port 8888 --host 127.0.0.1\033[0m"
    return 1
  fi

  # Render formatted terminal preview card directly in the terminal
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

  # Portable read prompt for both Bash and Zsh
  printf "\033[1m[Enter]\033[0m Execute in shell  |  \033[1m[e]\033[0m Edit command  |  \033[1m[q]\033[0m Cancel: "
  read -r ACTION

  case "$ACTION" in
    ""|"y"|"Y")
      echo -e "\033[0;32m==> Running:\033[0m $CMD"
      echo ""
      if [ -n "$ZSH_VERSION" ]; then
        print -s "$CMD"
      else
        history -s "$CMD" 2>/dev/null || true
      fi
      eval "$CMD"
      ;;
    "e"|"E")
      echo ""
      if [ -n "$ZSH_VERSION" ]; then
        print -s "$CMD"
      else
        history -s "$CMD" 2>/dev/null || true
      fi
      echo -e "Command loaded into history. Press \033[1;33m[Up Arrow]\033[0m to edit and execute:"
      echo -e "\033[1;36m$CMD\033[0m"
      ;;
    *)
      echo -e "\033[0;31mCancelled.\033[0m"
      ;;
  esac
}

# Bind aliases for both '?' and 'ai' so both work in Zsh and Bash
alias '?'='bashai'
alias 'ai'='bashai'
?() { bashai "$@"; }
