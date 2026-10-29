import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Shield, Key, Sliders, Server, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SshIntegrationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'direct' | 'curl'>('direct');
  const [backend, setBackend] = useState<'llamacpp' | 'ollama' | 'openai'>('llamacpp');
  const [port, setPort] = useState('8888');
  const [model, setModel] = useState('gemma-2b-it');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 100% self-contained paste block (zero external network calls, completely bypasses Cloud Run auth)
  const selfContainedBlock = `cat << 'EOF' > ~/.bashai_llama.sh
# BashAI Shell Assistant for llama.cpp on port ${port}
export BASHAI_ENDPOINT="http://localhost:${port}"
export BASHAI_MODEL="${model}"

?() {
  if [ $# -eq 0 ]; then
    echo -e "\\033[1;36m==> BashAI llama.cpp Assistant ($BASHAI_MODEL on port ${port})\\033[0m"
    echo -e "Usage: \\033[33m? <plain english query>\\033[0m"
    echo -e "Example: \\033[32m? check listening ports\\033[0m"
    return 0
  fi

  local QUERY="$*"
  local CURRENT_DIR="$PWD"
  echo -e "\\033[0;36m[BashAI]\\033[0m Querying llama.cpp on $BASHAI_ENDPOINT ($BASHAI_MODEL)..."

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

  read -p $'\\033[1m[Enter]\\033[0m Execute in shell  |  \\033[1m[e]\\033[0m Edit command  |  \\033[1m[q]\\033[0m Cancel: ' ACTION
  case "$ACTION" in
    ""|"y"|"Y")
      echo -e "\\033[0;32m==> Running:\\033[0m $CMD"
      echo ""
      history -s "$CMD"
      eval "$CMD"
      ;;
    "e"|"E")
      echo ""
      history -s "$CMD"
      echo -e "Command loaded into history. Press \\033[1;33m[Up Arrow]\\033[0m to edit and execute:"
      echo -e "\\033[1;36m$CMD\\033[0m"
      ;;
    *)
      echo -e "\\033[0;31mCancelled.\\033[0m"
      ;;
  esac
}
EOF
grep -q "bashai_llama.sh" ~/.bashrc 2>/dev/null || echo '[ -f "$HOME/.bashai_llama.sh" ] && source "$HOME/.bashai_llama.sh"' >> ~/.bashrc
source ~/.bashai_llama.sh
echo -e "\\033[1;32m[✓] BashAI successfully installed for llama.cpp on port ${port}!\\033[0m"
echo -e "Try it now: \\033[1;36m? check listening ports\\033[0m"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 overflow-hidden font-sans flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Direct SSH & Real Linux Shell Integration</h2>
              <p className="text-xs text-neutral-400">Run directly inside your active SSH session on port {port}</p>
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
          {/* Note explaining why curl gave 404 */}
          <div className="p-3 rounded bg-amber-950/40 border border-amber-800/80 text-amber-200 space-y-1">
            <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Why external `curl` returns 404:</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
              The AI Studio preview cloud URL (<code className="text-white font-mono bg-amber-900/60 px-1 py-0.5 rounded">ais-pre-...</code>) is protected behind Google authentication cookies. When curling from a remote terminal outside your browser, Google blocks the unauthenticated request.
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed font-sans font-medium">
              Use the <strong className="text-white">Zero-Curl Paste Block below</strong>: it is 100% self-contained, requires no external internet requests, and installs in 1 second!
            </p>
          </div>

          {/* Parameters */}
          <div className="p-3 rounded bg-neutral-950/80 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Your llama.cpp Settings
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">Port {port}</span>
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

          {/* Self-Contained Paste Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Recommended: 1-Click Copy & Paste into SSH Terminal
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

          {/* How It Operates */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              How It Works When You Type `? &lt;query&gt;`:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/60 flex items-start gap-2">
                <Server className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Direct Localhost Connection</span>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Sends OpenAI requests to <code className="text-neutral-300">http://localhost:{port}/v1/chat/completions</code> on the local machine with 0 network latency.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/60 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Interactive Confirmation</span>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Shows dry-run preview with safety checks. Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">Enter</kbd> to execute, <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">e</kbd> to edit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="text-xs text-neutral-400">
            Start llama.cpp: <code className="text-cyan-300 font-mono">llama-server -m your_model.gguf --port {port}</code>
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
