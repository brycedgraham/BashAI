import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Shield, Sliders, Server, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SshIntegrationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shellType, setShellType] = useState<'zsh' | 'bash'>('zsh');
  const [port, setPort] = useState('8888');
  const [model, setModel] = useState('gemma-2b-it');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rcFile = shellType === 'zsh' ? '~/.zshrc' : '~/.bashrc';
  const scriptName = shellType === 'zsh' ? '~/.zshai_llama.zsh' : '~/.bashai_llama.sh';

  // 100% self-contained paste block tailored for Zsh or Bash
  const selfContainedBlock = `cat << 'EOF' > ${scriptName}
# BashAI Shell Assistant for llama.cpp on port ${port} (${shellType.toUpperCase()})
export BASHAI_ENDPOINT="http://localhost:${port}"
export BASHAI_MODEL="${model}"

bashai() {
  if [ $# -eq 0 ]; then
    echo -e "\\033[1;36m==> BashAI llama.cpp Assistant ($BASHAI_MODEL on $BASHAI_ENDPOINT)\\033[0m"
    echo -e "Usage: \\033[33m? <plain english query>\\033[0m or \\033[33mai <query>\\033[0m"
    echo -e "Example: \\033[32m? check listening ports\\033[0m"
    return 0
  fi

  local QUERY="$*"
  local CURRENT_DIR="$PWD"
  echo -e "\\033[0;36m[BashAI]\\033[0m Consulting llama.cpp on $BASHAI_ENDPOINT ($BASHAI_MODEL)..."

  local SYS_PROMPT="You are a Linux sysadmin assistant. Current dir: $CURRENT_DIR. Translate: '$QUERY' into a single bash command. Return JSON ONLY with fields: {\\"command\\": \\"...\\", \\"explanation\\": \\"...\\", \\"safetyLevel\\": \\"safe|warning|destructive\\"}"

  local JSON_PAYLOAD=$(python3 -c "import json, sys; print(json.dumps({'model': sys.argv[1], 'messages': [{'role': 'system', 'content': sys.argv[2]}, {'role': 'user', 'content': sys.argv[3]}], 'temperature': 0.1, 'response_format': {'type': 'json_object'}}))" "$BASHAI_MODEL" "$SYS_PROMPT" "$QUERY" 2>/dev/null)
  local RAW_RESP=$(curl -s --connect-timeout 4 -X POST "$BASHAI_ENDPOINT/v1/chat/completions" -H "Content-Type: application/json" -d "$JSON_PAYLOAD" 2>/dev/null)

  local CMD=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    parsed = json.loads(content) if content.startswith('{') else {}
    if not parsed:
        m = re.search(r'\\{.*\\}', content, re.DOTALL)
        parsed = json.loads(m.group(0)) if m else {}
    print(parsed.get('command', ''))
except Exception:
    pass" "$RAW_RESP" 2>/dev/null)

  local EXP=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    m = re.search(r'\\{.*\\}', content, re.DOTALL)
    parsed = json.loads(m.group(0)) if m else {}
    print(parsed.get('explanation', ''))
except Exception:
    pass" "$RAW_RESP" 2>/dev/null)

  local SAF=$(python3 -c "import json, sys, re
raw = sys.argv[1]
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    m = re.search(r'\\{.*\\}', content, re.DOTALL)
    parsed = json.loads(m.group(0)) if m else {}
    print(parsed.get('safetyLevel', 'safe'))
except Exception:
    print('safe')" "$RAW_RESP" 2>/dev/null)

  if [ -z "$CMD" ]; then
    echo -e "\\033[1;31m[!] Could not connect to llama.cpp on $BASHAI_ENDPOINT\\033[0m"
    echo -e "Make sure llama-server is running on port ${port}:"
    echo -e "  \\033[36mllama-server -m your_model.gguf --port ${port} --host 127.0.0.1\\033[0m"
    return 1
  fi

  echo -e ""
  echo -e "\\033[1;30m┌─────────────────────────────────────────────────────────────────┐\\033[0m"
  if [ "$SAF" = "destructive" ]; then
    echo -e "\\033[1;30m│\\033[0m \\033[1;31m[!] HIGH RISK / DESTRUCTIVE\\033[0m                                     \\033[1;30m│\\033[0m"
  elif [ "$SAF" = "warning" ]; then
    echo -e "\\033[1;30m│\\033[0m \\033[1;33m[!] ELEVATED RISK\\033[0m                                               \\033[1;30m│\\033[0m"
  else
    echo -e "\\033[1;30m│\\033[0m \\033[1;32m[✓] SAFE (Read-Only / Nominal)\\033[0m                                  \\033[1;30m│\\033[0m"
  fi
  echo -e "\\033[1;30m├─────────────────────────────────────────────────────────────────┤\\033[0m"
  echo -e "\\033[1;30m│\\033[0m \\033[1;37mCommand:\\033[0m \\033[1;36m$CMD\\033[0m"
  echo -e "\\033[1;30m│\\033[0m \\033[0;37mDetails:\\033[0m $EXP"
  echo -e "\\033[1;30m└─────────────────────────────────────────────────────────────────┘\\033[0m"
  echo -e ""

  printf "\\033[1m[Enter]\\033[0m Execute in shell  |  \\033[1m[e]\\033[0m Edit command  |  \\033[1m[q]\\033[0m Cancel: "
  read -r ACTION
  case "$ACTION" in
    ""|"y"|"Y")
      echo -e "\\033[0;32m==> Running:\\033[0m $CMD"
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
      echo -e "Command loaded into history. Press \\033[1;33m[Up Arrow]\\033[0m to edit and execute:"
      echo -e "\\033[1;36m$CMD\\033[0m"
      ;;
    *)
      echo -e "\\033[0;31mCancelled.\\033[0m"
      ;;
  esac
}

# Bind aliases for both '?' and 'ai'
alias '?'='bashai'
alias 'ai'='bashai'
?() { bashai "$@"; }
EOF
grep -q "${scriptName}" ${rcFile} 2>/dev/null || echo '[ -f "${scriptName}" ] && source "${scriptName}"' >> ${rcFile}
source ${scriptName}
echo -e "\\033[1;32m[✓] BashAI successfully installed for ${shellType.toUpperCase()} with llama.cpp on port ${port}!\\033[0m"
echo -e "Try it now in your terminal: \\033[1;36m? check listening ports\\033[0m (or \\033[1;36mai check ports\\033[0m)"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 overflow-hidden font-sans flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                SSH Terminal Installation ({shellType.toUpperCase()})
              </h2>
              <p className="text-xs text-neutral-400">
                Optimized for {shellType === 'zsh' ? 'Z Shell (Zsh / Oh-My-Zsh)' : 'GNU Bash'} with llama.cpp on port {port}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Shell Selector Tabs */}
          <div className="flex items-center justify-between p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 px-3">Select Your Shell:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShellType('zsh')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  shellType === 'zsh'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Zsh (Z Shell)
              </button>
              <button
                type="button"
                onClick={() => setShellType('bash')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  shellType === 'bash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Bash
              </button>
            </div>
          </div>

          {/* Zsh Specific Callout */}
          {shellType === 'zsh' && (
            <div className="p-3 rounded bg-cyan-950/40 border border-cyan-800/80 text-cyan-200 space-y-1">
              <div className="font-semibold text-xs text-cyan-300">
                Special Zsh Feature Handling:
              </div>
              <p className="text-xs text-cyan-200/90 leading-relaxed font-sans">
                In Zsh, question marks are sometimes treated as wildcards. This script configures an alias for <code className="text-white font-mono bg-cyan-900/60 px-1 py-0.5 rounded">?</code> as well as <code className="text-white font-mono bg-cyan-900/60 px-1 py-0.5 rounded">ai</code>, so both <code className="text-white font-mono">? check ports</code> and <code className="text-white font-mono">ai check ports</code> work cleanly without wildcard errors.
              </p>
            </div>
          )}

          {/* Parameters */}
          <div className="p-3 rounded bg-neutral-950/80 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> llama.cpp Parameters
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">Configures {rcFile}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">llama.cpp Port</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">localhost:</span>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="8888"
                    className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-neutral-800 font-mono text-neutral-200 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Model Name</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gemma-2b-it"
                  className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-neutral-800 font-mono text-neutral-200 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Downloaded Files Local Execution Card */}
          <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Option 1: Run Downloaded Code File Locally
              </span>
              <button
                onClick={() => handleCopy("bash public/install.sh", 'local-run')}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
              >
                {copiedId === 'local-run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === 'local-run' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Since you have the downloaded files on your server, simply run the installer directly. It automatically detects Zsh and Bash:
            </p>
            <div className="flex items-center justify-between p-2 rounded bg-black/80 font-mono text-xs text-emerald-300 border border-neutral-800/80">
              <code>bash public/install.sh</code>
              <span className="text-[10px] text-neutral-500 font-sans">(or: chmod +x public/install.sh && ./public/install.sh)</span>
            </div>
          </div>

          {/* Self-Contained Paste Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Option 2: Zero-File Terminal Paste Block
              </label>
              <button
                onClick={() => handleCopy(selfContainedBlock, 'self-contained')}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {copiedId === 'self-contained' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'self-contained' ? 'Copied to Clipboard!' : 'Copy Script Block'}</span>
              </button>
            </div>

            <pre className="p-3 rounded bg-black/90 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-56 leading-relaxed select-all">
              {selfContainedBlock}
            </pre>
          </div>

          {/* Activation step */}
          <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800 text-xs flex items-center justify-between">
            <span className="text-neutral-400">To activate in your current session:</span>
            <code className="text-cyan-300 font-mono font-semibold">source {rcFile}</code>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="text-xs text-neutral-400">
            Target: <code className="text-cyan-300 font-mono">{rcFile}</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
